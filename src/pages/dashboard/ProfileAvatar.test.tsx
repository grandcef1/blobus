// ARCHITECT: компонент аватара проверяется на моке api-слоя и подготовки файла: UI не должен зависеть от
// canvas и storage. Негативы обязательны: невалидный файл, 401 без тоста, in-flight гард.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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

function fileInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector('input[type="file"]');

    if (!(input instanceof HTMLInputElement)) throw new Error("файловый input не найден");

    return input;
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
    it("6.1 своя картинка: img с avatarUrl и кнопки «Сменить»/«Удалить»", () => {
        const { container } = renderAvatar({ avatarUrl: OWN_URL });
        const image = container.querySelector("img");

        expect(image?.getAttribute("src")).toBe(OWN_URL);
        expect(image?.getAttribute("alt")).toBe("Фото профиля");
        expect(screen.getByRole("button", { name: "Сменить фото" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Удалить фото" })).toBeInTheDocument();
    });

    it("6.2 только Google: img с провайдерским src, «Удалить» нет", () => {
        const { container } = renderAvatar({ providerAvatarUrl: PROVIDER_URL });

        expect(container.querySelector("img")?.getAttribute("src")).toBe(PROVIDER_URL);
        expect(screen.queryByRole("button", { name: "Удалить фото" })).not.toBeInTheDocument();
    });

    it("6.3 обе ссылки null: иконка вместо img, «Удалить» нет", () => {
        const { container } = renderAvatar();

        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("svg")).not.toBeNull();
        expect(screen.queryByRole("button", { name: "Удалить фото" })).not.toBeInTheDocument();
    });

    it("6.4 выбор файла: подготовка, upload и инвалидация профиля", async () => {
        const user = userEvent.setup();
        const { container } = renderAvatar();
        const file = makeFile();

        uploadAvatarMock.mockResolvedValue({ avatarPath: "u-1/new.png" });

        await user.upload(fileInput(container), file);

        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledWith(DATA_URL));
        expect(prepareMock).toHaveBeenCalledWith(file);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] });
    });

    it("6.5 невалидный файл: тост invalid, upload не вызван", async () => {
        const user = userEvent.setup();
        const { container } = renderAvatar();

        prepareMock.mockRejectedValue(new Error("bad file"));

        await user.upload(fileInput(container), makeFile());

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Подойдёт JPG или PNG до 8 МБ")
        );
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });
    it("6.6 ошибка upload: 500 даёт тост, 401 — без тоста", async () => {
        const user = userEvent.setup();
        const { container } = renderAvatar();
        const input = fileInput(container);

        uploadAvatarMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        await user.upload(input, makeFile());
        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось обновить фото")
        );

        toastErrorMock.mockReset();
        uploadAvatarMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));

        await user.upload(input, makeFile());
        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("6.7 «Удалить»: deleteAvatar и инвалидация профиля", async () => {
        const user = userEvent.setup();

        renderAvatar({ avatarUrl: OWN_URL });
        deleteAvatarMock.mockResolvedValue({ avatarPath: null });

        await user.click(screen.getByRole("button", { name: "Удалить фото" }));

        await waitFor(() => expect(deleteAvatarMock).toHaveBeenCalledTimes(1));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] });
    });

    it("6.8 in-flight: второй выбор файла до завершения не запускает второй upload", async () => {
        const user = userEvent.setup();
        const { container } = renderAvatar();
        let resolveUpload: (value: { avatarPath: string }) => void = () => undefined;

        uploadAvatarMock.mockReturnValue(
            new Promise((resolve) => {
                resolveUpload = resolve;
            })
        );

        const input = fileInput(container);

        await user.upload(input, makeFile());
        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(1));

        await user.upload(input, makeFile());

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1);

        resolveUpload({ avatarPath: "u-1/new.png" });
        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] }));
    });
});

describe("prepareAvatarDataUrl (реальный модуль)", () => {
    it("6.9 неподдерживаемый тип файла отклоняется", async () => {
        const { prepareAvatarDataUrl } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");

        await expect(
            prepareAvatarDataUrl(new File(["x"], "a.gif", { type: "image/gif" }))
        ).rejects.toThrow();
    });

    it("6.10 файл больше 8 МБ отклоняется", async () => {
        const { prepareAvatarDataUrl } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");
        const big = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", {
            type: "image/png",
        });

        await expect(prepareAvatarDataUrl(big)).rejects.toThrow();
    });
});
