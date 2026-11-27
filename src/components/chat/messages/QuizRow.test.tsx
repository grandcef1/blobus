// ARCHITECT: выбор ученика уходит наверх и передаётся со следующим сообщением: верность сверяет сервер по своей
// карточке, поэтому проверка на клиенте остаётся только показом (§16.2).

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizRow } from "@/components/chat/messages/QuizRow";
import { renderWithProviders } from "@/test/utils";

const CHOICE = {
    type: "choice" as const,
    prompt: "Pick the right option",
    options: [
        { id: "a", text: "go" },
        { id: "b", text: "went" },
    ],
    answerId: "b",
};

describe("QuizRow", () => {
    it("6.1 выбранный вариант уходит наверх", async () => {
        const onAnswer = vi.fn();
        const user = userEvent.setup();

        renderWithProviders(<QuizRow quiz={CHOICE} onAnswer={onAnswer} />);
        await user.click(screen.getByRole("button", { name: /went/ }));

        expect(onAnswer).toHaveBeenCalledWith("b");
    });

    it("6.2 введённый ответ в пропуске уходит наверх, а неверный не открывает верный вариант", async () => {
        const onAnswer = vi.fn();
        const user = userEvent.setup();

        renderWithProviders(
            <QuizRow
                quiz={{ type: "gap-fill", prompt: "No ___ needed.", answer: "am" }}
                onAnswer={onAnswer}
            />
        );

        await user.type(screen.getByLabelText("Ответ"), "is");
        await user.click(screen.getByRole("button", { name: "Проверить" }));

        expect(onAnswer).toHaveBeenCalledWith("is");
        expect(screen.getAllByText(/Неверно/)).toHaveLength(1);
    });

    it("6.3 заголовок карточки — «Задание»", () => {
        renderWithProviders(<QuizRow quiz={CHOICE} />);

        expect(screen.getByText("Задание")).toBeInTheDocument();
        expect(screen.queryByText("Викторина")).toBeNull();
    });

    it("6.4 закрытое задание показывает выбранный и верный вариант, кнопок нет", () => {
        renderWithProviders(
            <QuizRow
                quiz={CHOICE}
                state={{ answered: true, selected: "a", correct: false, revealed: true }}
            />
        );

        // ARCHITECT: в payload у выбора лежит id опции, а в карточке показывается сам вариант.
        expect(screen.getByText("Ваш ответ")).toBeInTheDocument();
        expect(screen.getByText("go")).toBeInTheDocument();
        expect(screen.getByText("Верный ответ")).toBeInTheDocument();
        expect(screen.getByText("went")).toBeInTheDocument();
        // ARCHITECT: повторное прохождение невозможно: у закрытого задания нет ни одной кнопки (§спец. 9).
        expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("6.5 верный ответ не дублируется двумя одинаковыми строками", () => {
        renderWithProviders(
            <QuizRow
                quiz={CHOICE}
                state={{ answered: true, selected: "b", correct: true, revealed: false }}
            />
        );

        expect(screen.queryByText("Ваш ответ")).toBeNull();
        expect(screen.getByText("Верный ответ")).toBeInTheDocument();
        expect(screen.getByText("went")).toBeInTheDocument();
    });

    it("6.6 незакрытое задание остаётся проходимым: состояние ответа не блокирует карточку", async () => {
        const onAnswer = vi.fn();
        const user = userEvent.setup();

        renderWithProviders(
            <QuizRow
                quiz={CHOICE}
                state={{ answered: false, selected: "a", correct: false, revealed: false }}
                onAnswer={onAnswer}
            />
        );

        await user.click(screen.getByRole("button", { name: /went/ }));

        expect(onAnswer).toHaveBeenCalledWith("b");
    });
});
