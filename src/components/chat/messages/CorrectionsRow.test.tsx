// ARCHITECT: карточка исправления — порядок строк и двойная подача: цвет плюс начертание, поэтому она читается
// и без цвета. Проверяются классы, потому что jsdom цвет не считает (§8.2).

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChatCorrection } from "@/api/chat";
import { CorrectionsRow } from "@/components/chat/messages/CorrectionsRow";
import { highlightFixed, splitExample } from "@/components/chat/messages/correctionText";
import { renderWithProviders } from "@/test/utils";

const SOURCE = "Yesterday I go to the cinema with my friend.";
const CORRECTED = "Yesterday I went to the cinema with my friend.";

const CORRECTION: ChatCorrection = {
    fragment: "I go to",
    rule: "went — простое прошедшее для завершённого действия",
    examples: [CORRECTED, "I went home early."],
    kind: "error",
};

describe("CorrectionsRow", () => {
    it("4.1 показывает пару «как было — как верно» и дублирует цвет начертанием", () => {
        const { container } = renderWithProviders(
            <CorrectionsRow corrections={[CORRECTION]} source={SOURCE} level="B1" />
        );

        // Неверный фрагмент красный и зачёркнутый: начертание дублирует цвет.
        const wrongFragment = screen.getByText("I go to");

        expect(wrongFragment.className).toContain("line-through");
        expect(wrongFragment.closest("p")?.className).toContain("red");
        // Строка «как было» целиком — реплика ученика.
        expect(container.textContent).toContain(SOURCE);

        // Верный вариант: изменившееся слово зелёное и жирное.
        const fixedFragments = screen.getAllByText("went");

        expect(fixedFragments[0]?.className).toContain("emerald");
        expect(fixedFragments[0]?.className).toContain("font-semibold");
        expect(container.textContent).toContain(CORRECTED);

        // Правило стоит отдельной строкой с слабой левой линией.
        expect(screen.getByText(CORRECTION.rule).className).toContain("border-l");
    });

    it("4.2 первая строка — исправленный вариант, остальные примеры идут списком", () => {
        const { container } = renderWithProviders(
            <CorrectionsRow corrections={[CORRECTION]} source={SOURCE} level="B1" />
        );

        expect(container.textContent).toContain(CORRECTED);
        expect(container.textContent).toContain("I went home early.");
    });

    it("4.3 перевод примеров показывается только на A1-A2", () => {
        const withTranslation: ChatCorrection = {
            ...CORRECTION,
            examples: [CORRECTED, "I went home early. — Я пошёл домой рано."],
        };

        const a2 = renderWithProviders(
            <CorrectionsRow corrections={[withTranslation]} source={SOURCE} level="A2" />
        );

        expect(screen.getByText("Я пошёл домой рано.")).toBeInTheDocument();
        // На A2 строка примера разрезана: английский текст и перевод стоят отдельными строками.
        expect(a2.container.textContent).toContain("I went home early.");
        a2.unmount();

        const b1 = renderWithProviders(
            <CorrectionsRow corrections={[withTranslation]} source={SOURCE} level="B1" />
        );

        // ARCHITECT: на B1 перевод не показывается отдельной строкой: модель его на этом уровне и не пишет, а
        // интерфейс строку не режет и ничего не выдумывает.
        expect(screen.queryByText("Я пошёл домой рано.")).not.toBeInTheDocument();
        expect(b1.container.textContent).toContain("I went home early. — Я пошёл домой рано.");
    });

    it("4.4 без правок карточки нет", () => {
        const { container } = renderWithProviders(
            <CorrectionsRow corrections={[]} source={null} level="B1" />
        );

        expect(container.firstChild).toBeNull();
    });

    it("4.5 подсветка исправления не выдумывает текст и режет перевод по тире", () => {
        expect(highlightFixed("I go home", "I went home")).toEqual([
            { text: "I ", fixed: false },
            { text: "went", fixed: true },
            { text: " home", fixed: false },
        ]);
        // Неизменённое предложение подсвечивать нечем.
        expect(highlightFixed("I go home", "I go home")).toEqual([
            { text: "I go home", fixed: false },
        ]);
        expect(splitExample("I went home. — Я пошёл домой.", true).translation).toBe(
            "Я пошёл домой."
        );
        expect(splitExample("I went home. — Я пошёл домой.", false).translation).toBeNull();
    });
});
