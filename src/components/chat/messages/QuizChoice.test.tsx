// ARCHITECT: викторина с выбором проверяется без сети: важно, что верный ответ поднимает поздравление и
// мягкий сигнал, а промах даёт сигнал промаха и повтор, но не открывает верный вариант.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizChoice } from "@/components/chat/messages/QuizChoice";
import { playSound } from "@/lib/sounds";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/sounds", () => ({ playSound: vi.fn() }));

const OPTIONS = [
    { id: "a", text: "go" },
    { id: "b", text: "went" },
] as const;

describe("QuizChoice", () => {
    it("14.1 верный ответ: поздравление и сигнал верного ответа", async () => {
        const user = userEvent.setup();

        renderWithProviders(<QuizChoice options={OPTIONS} answerId="b" />);
        await user.click(screen.getByRole("button", { name: /went/ }));

        // ARCHITECT: «Верно» читается дважды: строка разбора под опциями и бейдж поздравления.
        expect(screen.getAllByText("Верно")).toHaveLength(2);
        expect(playSound).toHaveBeenCalledWith("correct");
    });

    it("14.2 промах: сигнал промаха и повтор, верный вариант закрыт", async () => {
        const user = userEvent.setup();

        renderWithProviders(<QuizChoice options={OPTIONS} answerId="b" />);
        await user.click(screen.getByRole("button", { name: /go/ }));

        expect(screen.getAllByText(/Неверно/)).toHaveLength(1);
        expect(screen.getByRole("button", { name: "Заново" })).toBeInTheDocument();
        expect(playSound).toHaveBeenCalledWith("wrong");
    });
});
