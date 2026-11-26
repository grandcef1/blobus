// ARCHITECT: обойма аватара: мок api-слоя, декодирования файла, рендера кропа и тостов, свой QueryClient со
// шпионом на invalidateQueries (renderWithProviders создал бы клиент, за которым не видно инвалидацию).
// Проверяются карточка (ховер-оверлей), модалка (спиннер активного действия, шаг кропа, гарды) и реальные
// функции avatarImage (валидация, геометрия кропа, рендер через canvas).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { ApiError } from "@/api/client";
import { ProfileAvatar } from "@/pages/dashboard/ProfileAvatar";

const { uploadAvatarMock, deleteAvatarMock, decodeMock, renderMock, toastErrorMock } = vi.hoisted(
    () => ({
        uploadAvatarMock: vi.fn(),
        deleteAvatarMock: vi.fn(),
        decodeMock: vi.fn(),
        renderMock: vi.fn(),
        toastErrorMock: vi.fn(),
    })
);

vi.mock("@/api/profile", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/profile")>();
    return { ...actual, uploadAvatar: uploadAvatarMock, deleteAvatar: deleteAvatarMock };
});

vi.mock("@/lib/avatarImage", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/avatarImage")>();
    return { ...actual, decodeAvatarFile: decodeMock, renderCroppedAvatar: renderMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

const OWN_URL = "http://127.0.0.1:54321/storage/v1/object/sign/avatars/u-1/a.png?token=1";
const PROVIDER_URL = "https://lh3.googleusercontent.com/a/test-avatar";
const DATA_URL = "data:image/jpeg;base64,AAAA";
const ZOOM_LABEL = "Масштаб";

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

/** Декодированная картинка: у элемента достаточно размеров и src — canvas в тестах подменён. */
function makeImage(width = 800, height = 600): HTMLImageElement {
    const image = new Image();

    image.width = width;
    image.height = height;
    image.src = "blob:fake";

    return image;
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

/** Выбор картинки: модалка обязана перейти в шаг кропа, а не грузить файл напрямую. */
async function pickFile(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.upload(fileInput(), makeFile());

    await screen.findByRole("slider", { name: ZOOM_LABEL });
}

function cropButton(name: string): HTMLElement {
    return screen.getByRole("button", { name });
}

/** Закрытие модалки: подтверждает, что мутация действительно довела обработчик до конца. */
async function expectDialogClosed(): Promise<void> {
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    decodeMock.mockResolvedValue(makeImage());
    renderMock.mockReturnValue(DATA_URL);
});

afterEach(() => {
    uploadAvatarMock.mockReset();
    deleteAvatarMock.mockReset();
    decodeMock.mockReset();
    renderMock.mockReset();
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

    it("12: цепочка своя → Google → User и замена битого источника", () => {
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

        expect(cropButton("Загрузить фото")).toBeInTheDocument();
        expect(cropButton("Удалить фото")).toBeInTheDocument();

        await user.keyboard("{Escape}");
        await expectDialogClosed();
        own.unmount();

        renderAvatar({ providerAvatarUrl: PROVIDER_URL });

        await openDialog(user);

        expect(cropButton("Загрузить фото")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Удалить фото" })).not.toBeInTheDocument();
    });

    it("4: во время удаления на кнопке спиннер, остальные действия заблокированы", async () => {
        const user = userEvent.setup();
        let resolveDelete: (value: { avatarPath: null }) => void = () => undefined;

        renderAvatar({ avatarUrl: OWN_URL });
        deleteAvatarMock.mockReturnValue(
            new Promise((resolve) => {
                resolveDelete = resolve;
            })
        );

        await openDialog(user);
        await user.click(cropButton("Удалить фото"));

        const remove = cropButton("Удалить фото");

        await waitFor(() => expect(remove).toHaveAttribute("aria-busy", "true"));
        expect(cropButton("Загрузить фото")).toBeDisabled();

        resolveDelete({ avatarPath: null });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] }));
        await expectDialogClosed();
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });

    it("5: выбор файла открывает кроппер и пока ничего не грузит", async () => {
        const user = userEvent.setup();
        const file = makeFile();

        renderAvatar();

        await openDialog(user);
        await user.upload(fileInput(), file);

        expect(await screen.findByRole("slider", { name: ZOOM_LABEL })).toBeInTheDocument();
        expect(cropButton("Сбросить")).toBeInTheDocument();
        expect(cropButton("Отмена")).toBeInTheDocument();
        expect(cropButton("Применить")).toBeInTheDocument();
        expect(screen.getByText("Перетащите фото и выберите масштаб")).toBeInTheDocument();
        expect(decodeMock).toHaveBeenCalledWith(file);
        expect(screen.queryByRole("button", { name: "Загрузить фото" })).not.toBeInTheDocument();
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });

    it("6: «Применить» грузит обрезанное фото, показывает спиннер и закрывает модалку", async () => {
        const user = userEvent.setup();
        let resolveUpload: (value: { avatarPath: string }) => void = () => undefined;

        renderAvatar();
        uploadAvatarMock.mockReturnValue(
            new Promise((resolve) => {
                resolveUpload = resolve;
            })
        );

        await openDialog(user);
        await pickFile(user);
        await user.click(cropButton("Применить"));

        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledWith(DATA_URL));
        expect(renderMock).toHaveBeenCalledTimes(1);

        // ARCHITECT: пока грузится, спиннер стоит на кнопке применения, а прочие контролы заблокированы.
        const apply = cropButton("Применить");

        expect(apply).toHaveAttribute("aria-busy", "true");
        expect(cropButton("Сбросить")).toBeDisabled();
        expect(cropButton("Отмена")).toBeDisabled();

        resolveUpload({ avatarPath: "u-1/new.png" });

        await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] }));
        await expectDialogClosed();
    });

    it("7: «Отмена» в кроппере возвращает к выбору файла без загрузки", async () => {
        const user = userEvent.setup();

        renderAvatar();

        await openDialog(user);
        await pickFile(user);
        await user.click(cropButton("Отмена"));

        await waitFor(() =>
            expect(screen.queryByRole("slider", { name: ZOOM_LABEL })).not.toBeInTheDocument()
        );
        expect(cropButton("Загрузить фото")).toBeInTheDocument();
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });

    it("8: невалидный файл даёт тост и не открывает кроппер", async () => {
        const user = userEvent.setup();

        renderAvatar();

        await openDialog(user);

        // ARCHITECT: тип вне accept отсекает сам input — до нашего декодера файл не доходит.
        await user.upload(fileInput(), makeFile("image/gif"));

        expect(decodeMock).not.toHaveBeenCalled();

        decodeMock.mockRejectedValueOnce(new Error("image could not be decoded"));
        await user.upload(fileInput(), makeFile());

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Подойдёт JPG или PNG до 8 МБ")
        );
        expect(screen.queryByRole("slider", { name: ZOOM_LABEL })).not.toBeInTheDocument();
        expect(uploadAvatarMock).not.toHaveBeenCalled();
    });

    it("9: двойной «Применить» до ответа даёт одну загрузку", async () => {
        const user = userEvent.setup();
        let resolveUpload: (value: { avatarPath: string }) => void = () => undefined;

        renderAvatar();
        uploadAvatarMock.mockReturnValue(
            new Promise((resolve) => {
                resolveUpload = resolve;
            })
        );

        await openDialog(user);
        await pickFile(user);

        const apply = cropButton("Применить");

        await user.click(apply);
        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(1));

        // ARCHITECT: прямой клик по disabled-кнопке — гард обязан держать и этот путь, а не только disabled.
        fireEvent.click(apply);

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1);

        resolveUpload({ avatarPath: "u-1/new.png" });
        await expectDialogClosed();
    });

    it("10: ошибка загрузки: 500 даёт тост и оставляет кроппер, 401 — без тоста", async () => {
        const user = userEvent.setup();

        renderAvatar();
        uploadAvatarMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        await openDialog(user);
        await pickFile(user);
        await user.click(cropButton("Применить"));

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось обновить фото")
        );
        expect(screen.getByRole("slider", { name: ZOOM_LABEL })).toBeInTheDocument();

        toastErrorMock.mockReset();
        uploadAvatarMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));

        await user.click(cropButton("Применить"));

        await waitFor(() => expect(uploadAvatarMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(screen.getByRole("slider", { name: ZOOM_LABEL })).toBeInTheDocument();
    });

    it("11: Escape закрывает модалку без мутаций", async () => {
        const user = userEvent.setup();

        renderAvatar({ avatarUrl: OWN_URL });
        await openDialog(user);
        await user.keyboard("{Escape}");
        await expectDialogClosed();

        expect(uploadAvatarMock).not.toHaveBeenCalled();
        expect(deleteAvatarMock).not.toHaveBeenCalled();
    });

    /** Смещение кадра из inline-стиля превью: та же величина, что уходит в computeCropRect. */
    function previewOffset(): { readonly x: number; readonly y: number } {
        const preview = document.body.querySelector('img[alt=""]');
        const transform = preview instanceof HTMLImageElement ? preview.style.transform : "";
        const match =
            /translate\(calc\(-50% \+ (-?[\d.]+)px\), calc\(-50% \+ (-?[\d.]+)px\)\)/.exec(
                transform
            );

        if (match === null) throw new Error(`смещение кадра не найдено в стиле: ${transform}`);

        return { x: Number(match[1]), y: Number(match[2]) };
    }

    it("15: стрелки двигают кадр и не выходят за границы clamp", async () => {
        const user = userEvent.setup();

        renderAvatar();
        await openDialog(user);
        await pickFile(user);

        const viewport = screen.getByLabelText("Перетащите фото и выберите масштаб");

        viewport.focus();

        expect(viewport).toHaveFocus();

        await user.keyboard("{ArrowRight}");

        expect(previewOffset().x).toBe(8);
        expect(previewOffset().y).toBe(0);

        await user.keyboard("{ArrowDown}");

        // ARCHITECT: у картинки 800×600 при zoom=1 вертикального запаса нет — кламп держит y на нуле.
        expect(previewOffset().y).toBe(0);

        for (let step = 0; step < 20; step += 1) {
            await user.keyboard("{ArrowRight}");
        }

        // ARCHITECT: предел тот же, что считает модель кропа: (800 * 256/600 − 256) / 2; браузер сериализует
        // значение стиля с округлением, поэтому сравнение с допуском.
        expect(previewOffset().x).toBeCloseTo((800 * (256 / 600) - 256) / 2, 3);
    });
});

describe("avatarImage (реальный модуль)", () => {
    it("13: валидация файла, геометрия кропа и рендер рамки", async () => {
        const { clampOffset, computeCropRect, decodeAvatarFile, renderCroppedAvatar } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");

        // ARCHITECT: тип и вес отклоняются до декодирования — память декодера не тратится впустую.
        await expect(
            decodeAvatarFile(new File(["x"], "a.gif", { type: "image/gif" }))
        ).rejects.toThrow();
        await expect(
            decodeAvatarFile(
                new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })
            )
        ).rejects.toThrow();

        const image = makeImage(800, 400);
        const base = { viewport: 256, zoom: 1, offsetX: 0, offsetY: 0 };
        const centered = computeCropRect(image, base);

        // ARCHITECT: zoom=1 и offset=0 — центральный квадрат по короткой стороне источника.
        expect(centered.displayScale).toBeCloseTo(0.64);
        expect(centered.side).toBe(400);
        expect(centered.sx).toBe(200);
        expect(centered.sy).toBe(0);
        expect(computeCropRect(image, { ...base, zoom: 2 }).side).toBe(200);

        // ARCHITECT: за краем окна пустых полос не бывает — смещение обрезается по текущему масштабу.
        expect(clampOffset(image, { ...base, zoom: 2, offsetX: 1000, offsetY: -1000 })).toEqual({
            x: 384,
            y: -128,
        });
        expect(clampOffset(image, base)).toEqual({ x: 0, y: 0 });

        const drawImage = vi.fn();

        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            drawImage,
        } as unknown as CanvasRenderingContext2D);
        vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(DATA_URL);

        expect(renderCroppedAvatar(image, { ...base, zoom: 2 })).toBe(DATA_URL);
        expect(drawImage).toHaveBeenCalledWith(image, 300, 100, 200, 200, 0, 0, 512, 512);
    });

    it("14: слишком длинный data URL перекодируется под лимит сервера", async () => {
        const { renderCroppedAvatar } =
            await vi.importActual<typeof import("@/lib/avatarImage")>("@/lib/avatarImage");

        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D);

        const toDataURL = vi
            .spyOn(HTMLCanvasElement.prototype, "toDataURL")
            .mockReturnValueOnce("x".repeat(400_000))
            .mockReturnValue(DATA_URL);
        const transform = { viewport: 256, zoom: 1, offsetX: 0, offsetY: 0 };

        expect(renderCroppedAvatar(makeImage(800, 800), transform)).toBe(DATA_URL);
        expect(toDataURL).toHaveBeenCalledTimes(2);
    });
});
