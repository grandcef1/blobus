// ARCHITECT: модалка добавления слова проверяется на моке api-слоя: контракт отправки (обрезка и null вместо
// пустых строк), закрытие после успеха, гард от повторного сабмита и разделение ошибок 401/прочие.
// Хост держит open, как это делает страница: контролируемый диалог иначе не закрыть.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { ApiError } from "@/api/client";
import type { VocabularyEntryDto } from "@/api/progress";
import { AddWordDialog } from "@/pages/dashboard/AddWordDialog";

const { addWordMock, toastErrorMock } = vi.hoisted(() => ({
    addWordMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("@/api/progress", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/progress")>();
    return { ...actual, addVocabularyEntry: addWordMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

const ENTRY: VocabularyEntryDto = {
    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11",
    term: "estimate",
    translation: "оценивать",
    context: null,
    exampleTranslation: null,
    sourceLessonId: null,
    stage: 1,
    nextDueAt: "2026-11-29T10:00:00.000Z",
    createdAt: "2026-11-29T10:00:00.000Z",
    updatedAt: "2026-11-29T10:00:00.000Z",
};

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Хост страницы: без него контролируемый диалог остался бы открытым после успеха. */
function Host() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Открыть
            </button>
            <AddWordDialog open={open} onOpenChange={setOpen} />
        </>
    );
}

/** Открывает модалку так, как это делает страница. */
async function openDialog(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    await user.click(screen.getByRole("button", { name: "Открыть" }));

    return screen.findByRole("dialog");
}

function textBox(name: string): HTMLInputElement | HTMLTextAreaElement {
    const field = screen.getByLabelText(name);

    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
        throw new Error(`поле «${name}» не найдено`);
    }

    return field;
}

/** Форма живёт в портале диалога: ищем её в document.body, а не в контейнере рендера. */
function submitForm(): void {
    const form = document.body.querySelector("form");

    if (!(form instanceof HTMLFormElement)) throw new Error("форма добавления не найдена");

    fireEvent.submit(form);
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    addWordMock.mockResolvedValue(ENTRY);
});

afterEach(() => {
    addWordMock.mockReset();
    toastErrorMock.mockReset();
    vi.restoreAllMocks();
});

function renderDialog() {
    return render(
        <Wrapper>
            <Host />
        </Wrapper>
    );
}

describe("AddWordDialog", () => {
    it("1: диалог открывается и закрывается, черновик сбрасывается", async () => {
        const user = userEvent.setup();

        renderDialog();

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await openDialog(user);

        expect(screen.getByText("Добавить слово")).toBeInTheDocument();
        expect(textBox("Слово")).toHaveAttribute("maxlength", "120");

        await user.type(textBox("Слово"), "estimate");
        await user.click(screen.getByRole("button", { name: "Отмена" }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

        await openDialog(user);

        expect(textBox("Слово")).toHaveValue("");
    });

    it("2: отправка шлёт обрезанное слово и null вместо пустых полей", async () => {
        const user = userEvent.setup();

        renderDialog();
        await openDialog(user);
        await user.type(textBox("Слово"), "  estimate  ");
        await user.type(textBox("Перевод"), "оценивать");
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        // ARCHITECT: мутация вызывает api через стрелку, поэтому мок получает ровно DTO отправки.
        await waitFor(() =>
            expect(addWordMock).toHaveBeenCalledWith({
                term: "estimate",
                translation: "оценивать",
                context: null,
                exampleTranslation: null,
            })
        );
        await waitFor(() =>
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["vocabulary"] })
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("3: пустое слово не уходит на сервер", async () => {
        const user = userEvent.setup();

        renderDialog();
        await openDialog(user);
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        expect(addWordMock).not.toHaveBeenCalled();

        await user.type(textBox("Слово"), "   ");
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        expect(addWordMock).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("4: пока запрос в полёте, повторный сабмит не даёт второго вызова", async () => {
        const user = userEvent.setup();
        let resolveAdd: (entry: VocabularyEntryDto) => void = () => undefined;

        addWordMock.mockReturnValue(
            new Promise((resolve) => {
                resolveAdd = resolve;
            })
        );

        renderDialog();
        await openDialog(user);
        await user.type(textBox("Слово"), "estimate");
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        await waitFor(() => expect(addWordMock).toHaveBeenCalledTimes(1));
        expect(screen.getByRole("button", { name: "Добавить" })).toBeDisabled();

        // ARCHITECT: сабмит формы напрямую — кнопка disabled, а гард обязан держать и этот путь.
        submitForm();

        expect(addWordMock).toHaveBeenCalledTimes(1);

        resolveAdd(ENTRY);

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("5: ошибка не-401 даёт тост и оставляет диалог, 401 — без тоста", async () => {
        const user = userEvent.setup();

        addWordMock.mockRejectedValueOnce(new ApiError(500, "Internal"));

        renderDialog();
        await openDialog(user);
        await user.type(textBox("Слово"), "estimate");
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        await waitFor(() =>
            expect(toastErrorMock).toHaveBeenCalledWith("Не удалось добавить слово")
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        toastErrorMock.mockReset();
        addWordMock.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));

        await user.click(screen.getByRole("button", { name: "Добавить" }));

        await waitFor(() => expect(addWordMock).toHaveBeenCalledTimes(2));

        // ARCHITECT: 401 разбирает общий useAuthExpiry — свой тост был бы вторым.
        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("6: дубль слова не считается ошибкой", async () => {
        const user = userEvent.setup();

        // ARCHITECT: при дубле сервер отвечает 200 с существующей записью — для клиента это тот же успех.
        addWordMock.mockResolvedValue(ENTRY);

        renderDialog();
        await openDialog(user);
        await user.type(textBox("Слово"), "estimate");
        await user.click(screen.getByRole("button", { name: "Добавить" }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["vocabulary"] });
        expect(toastErrorMock).not.toHaveBeenCalled();
    });
});
