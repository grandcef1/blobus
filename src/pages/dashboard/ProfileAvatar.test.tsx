// ARCHITECT: обойма аватара: мок api-слоя, подготовки файла и тостов, свой QueryClient со шпионом на
// invalidateQueries (renderWithProviders создал бы клиент, за которым не видно инвалидацию). Проверяются
// карточка (ховер-оверлей вместо двух кнопок) и модалка: негативы — 401 без тоста, невалидный файл,
// in-flight гард, Escape без мутаций.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { ApiError } from "@/api/client";
import { ProfileAvatar } from "@/pages/dashboard/ProfileAvatar";

const { uploadAvatarMock, deleteAvatarMock, prepareMock, toastErrorMock } = vi.hoisted(() => ({
    uploadAvatarMock: vi.fn(),
    deleteAvatarMock: vi.fn(),
    prepareMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("@/api/profile", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/profile")>();
    return { ...actual, uploadAvatar: uploadAvatarMock, deleteAvatar: deleteAvatarMock };
});

vi.mock("@/lib/avatarImage", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/avatarImage")>();
    return { ...actual, prepareAvatarDataUrl: prepareMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

const OWN_URL = "http://127.0.0.1:54321/storage/v1/object/sign/avatars/u-1/a.png?token=1";
const PROVIDER_URL = "https://lh3.googleusercontent.com/a/test-avatar";
const DATA_URL = "data:image/jpeg;base64,AAAA";

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderAvatar(
    props: { readonly avatarUrl?: string | null; readonly providerAvatarUrl?: string | null } = {}
) {
    return render(
        <Wrapper>
            <ProfileAvatar
                avatarUrl={props.avatarUrl ?? null}
                providerAvatarUrl={props.providerAvatarUrl ?? null}
                displayName="Алекс"
            />
        </Wrapper>
    );
}

function makeFile(type = "image/png", size = 1024): File {
    return new File([new Uint8Array(size)], "avatar.png", { type });
}

/** Файловый input живёт в портале диалога: ищем его в document.body, а не в контейнере рендера. */
function fileInput(): HTMLInputElement {
    const input = document.body.querySelector('input[type="file"]');

    if (!(input instanceof HTMLInputElement)) throw new Error("файловый input не найден");

    return input;
}

/** Открытие модалки так, как это делает человек: клик по затемнённому оверлею аватара. */
async function openDialog(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    await user.click(screen.getByRole("button", { name: "Сменить фото" }));

    return screen.findByRole("dialog");
}

/** Закрытие модалки: подтверждает, что мутация действительно довела обработчик до конца. */
async function expectDialogClosed(): Promise<void> {
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    prepareMock.mockResolvedValue(DATA_URL);
});

afterEach(() => {
    uploadAvatarMock.mockReset();
    deleteAvatarMock.mockReset();
    prepareMock.mockReset();
    toastErrorMock.mockReset();
    vi.restoreAllMocks();
});

describe("ProfileAvatar", () => {
    it("1: аватар виден, кнопок под ним нет, правит оверлей с aria-label", () => {
        const { container } = renderAvatar({ avatarUrl: OWN_URL });
        const image = container.querySelector("img");
        const overlay = screen.getByRole("button", { name: "Сменить фото" });

        expect(image?.getAttribute("src")).toBe(OWN_URL);
        expect(image?.getAttribute("alt")).toBe("Фото профиля");
        // ARCHITECT: подпись живёт только в aria-label — видимого текста у кнопки нет.
        expect(overlay).toHaveTextContent("");
        expect(screen.queryByText("Сменить фото")).not.toBeInTheDocument();
        expect(screen.queryByText("Удалить фото")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Удалить фото" })).not.toBeInTheDocument();
    });

    it("10: цепочка своя → Google → User и замена битого источника", () => {
        const own = renderAvatar({ avatarUrl: OWN_URL });

        expect(own.container.querySelector("img")?.getAttribute("src")).toBe(OWN_URL);
        own.unmount();

        const provider = renderAvatar({ providerAvatarUrl: PROVIDER_URL });

        expect(provider.container.querySelector("img")?.getAttribute("src")).toBe(PROVIDER_URL);
        provider.unmount();

        const none = renderAvatar();

        expect(none.container.querySelector("img")).toBeNull();
        expect(none.container.querySelector("svg")).not.toBeNull();
        none.unmount();

        // ARCHITECT: битый source помечается локально: сервер уже отдал ссылку, повторного запроса нет.
        const broken = renderAvatar({ avatarUrl: OWN_URL });
        const brokenImage = broken.container.querySelector("img");

        if (brokenImage === null) throw new Error("картинка аватара не отрендерена");

        fireEvent.error(brokenImage);

        expect(broken.container.querySelector("img")).toBeNull();
        expect(broken.container.querySelector("svg")).not.toBeNull();
    });
});

describe("AvatarEditDialog", () => {
    it("2: клик по оверлею открывает диалог с заголовком и подсказкой", async () => {
        const user = userEvent.setup();

        renderAvatar({ avatarUrl: OWN_URL });

        const dialog = await openDialog(user);

        expect(within(dialog).getByText("Фото профиля")).toBeInTheDocument();
        expect(within(dialog).getByText("JPG или PNG, до 8 МБ")).toBeInTheDocument();
    });

    it("3: «Загрузить фото» есть всегда, «Удалить фото» — только при своей картинке", async () => {
        const user = userEvent.setup();
        const own = renderAvatar({ avatarUrl: OWN_URL });

        await openDialog(user);

        expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Удалить фото" })).toBeInTheDocument();

        await user.keyboard("{Escape}");
        await expectDialogClosed();
        own.unmount();

        renderAvatar({ providerAvatarUrl: PROVIDER_URL });

        await openDialog(user);

        expect(screen.getByRole("button", { name: "Загрузить фото" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Удалить фото" })).not.toBeInTheDocument();
    });

    it("4: выбор файла: подготовка, upload, инвалидация и закрытие диалога", async () => {
        const user = userEvent.setup();
        const file = makeFile();

        renderAvatar();
        uploadAvatarMock.mockResolvedValue({ avatarPath: "u-1/new.png" });

        await openDialog(user);
        await user.upload(fileInput(), file);

        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledWith(DATA_URL));
        expect(prepareMock).toHaveBeenCalledWith(file);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] });

        await expectDialogClosed();
    });

    it("5: «Удалить фото»: deleteAvatar, инвалидация и закрытие диалога", async () => {
        const user = userEvent.setup();

        renderAvatar({ avatarUrl: OWN_URL });
        deleteAvatarMock.mockResolvedValue({ avatarPath: null });

        await openDialog(user);
        await user.click(screen.getByRole("button", { name: "Удалить фото" }));

        await waitFor(() => expect(deleteAvatarMock).toHaveBeenCalledTimes(1));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] });
        expect(uploadAvatarMock).not.toHaveBeenCalled();

        await expectDialogClosed();
    });
    it("6: ошибка upload: 500 даёт тост и открытый диалог, 401 — без тоста", async () => {
        const user = userEvent.setup();

        renderAvatar();
        await openDialog(user);

        uploadAvatarMock.mockRejectedValueOnce(new ApiError(500, "Internal"));
        await user.upload(fileInput(), makeFile());
        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось обновить фото")
        );

        // ARCHITECT: при ошибке модалка остаётся открытой — видно, что действие не прошло.
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        toastErrorMock.mockReset();
        uploadAvatarMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
        await user.upload(fileInput(), makeFile());
        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("7: сбой подготовки файла: тост invalid, upload не вызван", async () => {
        const user = userEvent.setup();

        renderAvatar();
        prepareMock.mockRejectedValue(new Error("bad file"));
        await openDialog(user);
        await user.upload(fileInput(), makeFile());

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Подойдёт JPG или PNG до 8 МБ")
        );
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });

    it("8: in-flight: второй файл до завершения не запускает второй upload", async () => {
        const user = userEvent.setup();
        let resolveUpload: (value: { avatarPath: string }) => void = () => undefined;

        renderAvatar();
        uploadAvatarMock.mockReturnValue(
            new Promise((resolve) => {
                resolveUpload = resolve;
            })
        );

        await openDialog(user);
        await user.upload(fileInput(), makeFile());
        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(1));

        await user.upload(fileInput(), makeFile());

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1);

        resolveUpload({ avatarPath: "u-1/new.png" });
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] }));
    });

    it("9: Escape закрывает диалог без мутаций", async () => {
        const user = userEvent.setup();

        renderAvatar({ avatarUrl: OWN_URL });
        await openDialog(user);
        await user.keyboard("{Escape}");
        await expectDialogClosed();

        expect(uploadAvatarMock).not.toHaveBeenCalled();
        expect(deleteAvatarMock).not.toHaveBeenCalled();
    });
});

describe("prepareAvatarDataUrl (реальный модуль)", () => {
    it("11: неподдерживаемый тип файла отклоняется", async () => {
        const { prepareAvatarDataUrl } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");

        await expect(
            prepareAvatarDataUrl(new File(["x"], "a.gif", { type: "image/gif" }))
        ).rejects.toThrow();
    });

    it("12: файл больше 8 МБ отклоняется", async () => {
        const { prepareAvatarDataUrl } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");
        const big = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", {
            type: "image/png",
        });

        await expect(prepareAvatarDataUrl(big)).rejects.toThrow();
    });
});
