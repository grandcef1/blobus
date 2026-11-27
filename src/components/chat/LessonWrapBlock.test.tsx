// ARCHITECT: блок итогового хода рисует клиент по данным сервера: слово, значение и статус. Список слов
// появляется только здесь, поэтому тест держит и статусы, и пустое состояние.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonWrapBlock } from "@/components/chat/LessonWrapBlock";

describe("LessonWrapBlock", () => {
    it("5.1 показывает слова урока со значением и статусом", () => {
        render(
            <LessonWrapBlock
                words={[
                    { word: "deadline", meaning: "срок", status: "introduced" },
                    { word: "improve", meaning: "улучшать", status: "produced" },
                ]}
            />
        );

        expect(screen.getByText("deadline")).toBeInTheDocument();
        expect(screen.getByText("срок")).toBeInTheDocument();
        expect(screen.getByText("показано")).toBeInTheDocument();
        expect(screen.getByText("improve")).toBeInTheDocument();
        expect(screen.getByText("употреблено")).toBeInTheDocument();
        expect(screen.getByText("Все слова урока уже в словаре")).toBeInTheDocument();
    });

    it("5.2 без слов блока нет: урок ещё идёт", () => {
        const { container } = render(<LessonWrapBlock words={[]} />);

        expect(container.firstChild).toBeNull();
    });
});
