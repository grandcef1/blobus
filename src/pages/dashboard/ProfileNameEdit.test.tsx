// ARCHITECT: правка имени проверяется на моке updateProfile: тихий карандаш, inline-поле, отмена, ошибки и
// in-flight гард. Ответ PATCH в кэш не попадает — после успеха ожидается только инвалидация ["profile"].
// ARCHITECT: режимы сменяет AnimatePresence, поэтому появление поля ждём через findBy, а возврат к просмотру
// через waitFor — сразу после клика старый узел ещё играет exit-анимацию.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { ApiError } from "@/api/client";
import { ProfileNameEdit } from "@/pages/dashboard/ProfileNameEdit";

const { updateProfileMock, toastErrorMock } = vi.hoisted(() => ({
    updateProfileMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("@/api/profile", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/profile")>();
    return { ...actual, updateProfile: updateProfileMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderName(displayName: string) {
    return render(
        <Wrapper>
            <ProfileNameEdit displayName={displayName} />
        </Wrapper>
    );
}

function pencilButton(): HTMLElement {
    return screen.getByRole("button", { name: "Изменить имя" });
}

function nameInput(): HTMLInputElement {
    const input = screen.getByLabelText("Отображаемое имя");

    if (!(input instanceof HTMLInputElement)) throw new Error("поле имени не найдено");

    return input;
}

/** Открытие правки: клик по карандашу и ожидание поля, которое появляется после exit-анимации просмотра. */
async function openEdit(user: ReturnType<typeof userEvent.setup>): Promise<HTMLInputElement> {
    await user.click(pencilButton());

    return screen.findByLabelText("Отображаемое имя");
}

/** Форма ищется по DOM: у submit-кнопки есть обработчик, но для гарда нужен прямой submit. */
function formOf(container: HTMLElement): HTMLFormElement {
    const form = container.querySelector("form");

    if (!(form instanceof HTMLFormElement)) throw new Error("форма имени не найдена");

    return form;
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
});

afterEach(() => {
    updateProfileMock.mockReset();
    toastErrorMock.mockReset();
    vi.restoreAllMocks();
});

describe("ProfileNameEdit", () => {
    it("1: имя в просмотре, карандаш с aria-label, видимых текстовых кнопок нет", () => {
        const named = renderName("Алекс");

        expect(screen.getByRole("heading", { name: "Алекс" })).toBeInTheDocument();
        // ARCHITECT: подпись живёт в aria-label: видимого текста у кнопки нет, иначе она была бы крупной.
        expect(pencilButton()).toHaveTextContent("");
        expect(screen.queryByText("Изменить имя")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Отмена" })).not.toBeInTheDocument();

        named.unmount();

        renderName("");

        expect(screen.getByRole("heading", { name: "Ученик" })).toBeInTheDocument();
        expect(pencilButton()).toBeInTheDocument();
    });

    it("2: клик по карандашу открывает inline-поле со значением имени и фокусом", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        const input = await openEdit(user);

        expect(input.value).toBe("Алекс");
        expect(input).toHaveFocus();
        expect(screen.queryByRole("heading", { name: "Алекс" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Изменить имя" })).not.toBeInTheDocument();
    });

    it("3: сохранение: обрезка пробелов, updateProfile, инвалидация и возврат к просмотру", async () => {
        const user = userEvent.setup();

        renderName("Алекс");
        updateProfileMock.mockResolvedValue({});

        await openEdit(user);
        await user.clear(nameInput());
        await user.type(nameInput(), "  Новое имя  ");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() =>
            expect(updateProfileMock).toHaveBeenCalledWith({ displayName: "Новое имя" })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["profile"] });

        await waitFor(() =>
            expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument()
        );
        expect(pencilButton()).toBeInTheDocument();
    });

    it("4: имя не изменилось — просмотр возвращается без запроса", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await openEdit(user);
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() =>
            expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument()
        );
        expect(updateProfileMock).not.toHaveBeenCalled();
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("5: Escape отменяет правку без запроса", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await openEdit(user);
        await user.keyboard("{Escape}");

        await waitFor(() =>
            expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument()
        );
        expect(updateProfileMock).not.toHaveBeenCalled();
        expect(screen.getByRole("heading", { name: "Алекс" })).toBeInTheDocument();
    });

    it("6: «Отмена» закрывает правку без запроса", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await openEdit(user);
        await user.click(screen.getByRole("button", { name: "Отмена" }));

        await waitFor(() =>
            expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument()
        );
        expect(updateProfileMock).not.toHaveBeenCalled();
        expect(pencilButton()).toBeInTheDocument();
    });

    it("7: ошибка сохранения: 500 даёт тост и оставляет правку, 401 — без тоста", async () => {
        const user = userEvent.setup();

        renderName("Алекс");
        updateProfileMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        await openEdit(user);
        await user.clear(nameInput());
        await user.type(nameInput(), "Новое имя");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось сохранить имя")
        );
        expect(screen.getByLabelText("Отображаемое имя")).toBeInTheDocument();

        toastErrorMock.mockReset();
        updateProfileMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));

        await user.clear(nameInput());
        await user.type(nameInput(), "Другое имя");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Отображаемое имя")).toBeInTheDocument();
    });

    it("8: in-flight: повторный submit до ответа не даёт второго вызова", async () => {
        const user = userEvent.setup();
        const { container } = renderName("Алекс");
        let resolveUpdate: () => void = () => undefined;

        updateProfileMock.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveUpdate = resolve;
            })
        );

        await openEdit(user);
        await user.clear(nameInput());
        await user.type(nameInput(), "Новое имя");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(1));

        // ARCHITECT: submit отправляется напрямую — кнопка уже disabled, а гард обязан держать и этот путь.
        fireEvent.submit(formOf(container));

        expect(updateProfileMock).toHaveBeenCalledTimes(1);

        resolveUpdate();

        await waitFor(() =>
            expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument()
        );
    });

    it("9: у поля та же граница длины, что у схемы", async () => {
        const user = userEvent.setup();

        renderName("Алекс");
        await openEdit(user);

        expect(nameInput()).toHaveAttribute("maxlength", "80");
    });

    it("10: пустое имя сохраняется, и после обновления профиля виден fallback", async () => {
        const user = userEvent.setup();
        const view = renderName("Алекс");

        updateProfileMock.mockResolvedValue({});

        await openEdit(user);
        await user.clear(nameInput());
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => expect(updateProfileMock).toHaveBeenCalledWith({ displayName: "" }));

        // ARCHITECT: пустое имя — валидное состояние, поэтому parent перерисовывает компонент с пустым пропсом.
        view.rerender(
            <Wrapper>
                <ProfileNameEdit displayName="" />
            </Wrapper>
        );

        await waitFor(() =>
            expect(screen.getByRole("heading", { name: "Ученик" })).toBeInTheDocument()
        );
    });
});
