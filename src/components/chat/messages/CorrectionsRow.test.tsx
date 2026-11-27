// ARCHITECT: цвет карточки правки — значимое состояние, а не украшение: ошибочный фрагмент зачёркнут
// красным, исправленный вариант зелёным. Проверяются классы, потому что jsdom цвет не считает.

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChatCorrection } from "@/api/chat";
import { CorrectionsRow } from "@/components/chat/messages/CorrectionsRow";
import { renderWithProviders } from "@/test/utils";

const CORRECTION: ChatCorrection = {
    fragment: "I go to the cinema",
    rule: "went — простое прошедшее для завершённого действия",
    examples: ["I went home early."],
    kind: "error",
};

describe("CorrectionsRow", () => {
    it("4.1 ошибочный фрагмент красный, исправление зелёное", () => {
        renderWithProviders(<CorrectionsRow corrections={[CORRECTION]} />);

        expect(screen.getByText(CORRECTION.fragment).className).toContain("red");
        expect(screen.getByText(CORRECTION.rule).className).toContain("emerald");
    });

    it("4.2 без правок карточки нет", () => {
        const { container } = renderWithProviders(<CorrectionsRow corrections={[]} />);

        expect(container.firstChild).toBeNull();
    });
});
