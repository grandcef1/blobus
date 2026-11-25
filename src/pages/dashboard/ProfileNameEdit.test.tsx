// ARCHITECT: правка имени проверяется на моке updateProfile: форма, отмена, ошибки и in-flight гард.
// Ответ PATCH в кэш не попадает — после успеха ожидается только инвалидация ["profile"].

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

function nameInput(): HTMLInputElement {
    const input = screen.getByLabelText("Отображаемое имя");

    if (!(input instanceof HTMLInputElement)) throw new Error("поле имени не найдено");

    return input;
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
    it("5.1 имя задано: показано имя и кнопка «Изменить имя»", () => {
        renderName("Алекс");

        expect(screen.getByRole("heading", { name: "Алекс" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Изменить имя" })).toBeInTheDocument();
    });

    it("5.2 пустое имя: показан fallback, поле при открытии пустое", async () => {
        const user = userEvent.setup();

        renderName("");

        expect(screen.getByRole("heading", { name: "Ученик" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));

        expect(nameInput().value).toBe("");
    });

    it("5.3 «Изменить имя»: поле открывается со значением текущего имени", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));

        expect(nameInput().value).toBe("Алекс");
        expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
    });

    it("5.4 «Сохранить»: обрезка пробелов, updateProfile, инвалидация и закрытие формы", async () => {
        const user = userEvent.setup();

        renderName("Алекс");
        updateProfileMock.mockResolvedValue({});

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));
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
    });

    it("5.5 «Отмена»: updateProfile не вызван, форма закрыта", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));
        await user.click(screen.getByRole("button", { name: "Отмена" }));

        expect(updateProfileMock).not.toHaveBeenCalled();
        expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Алекс" })).toBeInTheDocument();
    });
    it("5.6 ошибка сохранения: 500 даёт тост, 401 — без тоста", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        updateProfileMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));
        await user.clear(nameInput());
        await user.type(nameInput(), "Новое имя");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось сохранить имя")
        );

        toastErrorMock.mockReset();
        updateProfileMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));

        await user.clear(nameInput());
        await user.type(nameInput(), "Другое имя");
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("5.7 in-flight: повторный submit до ответа не даёт второго вызова", async () => {
        const user = userEvent.setup();
        const { container } = renderName("Алекс");
        let resolveUpdate: () => void = () => undefined;

        updateProfileMock.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveUpdate = resolve;
            })
        );

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));
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

    it("5.8 сохранение без изменений: updateProfile не вызван, форма закрыта", async () => {
        const user = userEvent.setup();

        renderName("Алекс");

        await user.click(screen.getByRole("button", { name: "Изменить имя" }));
        await user.click(screen.getByRole("button", { name: "Сохранить" }));

        expect(updateProfileMock).not.toHaveBeenCalled();
        expect(screen.queryByLabelText("Отображаемое имя")).not.toBeInTheDocument();
    });
});
