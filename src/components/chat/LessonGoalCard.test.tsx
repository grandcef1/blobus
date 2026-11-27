// ARCHITECT: карточка цели — компактный блок над лентой: цель, правило и счётчики прогресса. Тест держит
// главное: этап показывается номером текущей активности, а целевых слов в карточке нет — их нет в контракте.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChatLessonPlan } from "@/api/chat";
import { LessonGoalCard } from "@/components/chat/LessonGoalCard";

const PLAN: ChatLessonPlan = {
    goal: "говорить свободнее в повседневном диалоге связными фразами на два-три предложения.",
    rule: "Present Simple для привычек и рутины",
    step: 0,
    total: 6,
    wordsDone: 0,
    wordsTotal: 5,
    completed: false,
};

describe("LessonGoalCard", () => {
    it("показывает цель, правило и первый этап вместо нулевого", () => {
        render(<LessonGoalCard plan={PLAN} />);

        expect(screen.getByText(PLAN.goal)).toBeInTheDocument();
        expect(screen.getByText(`Правило: ${PLAN.rule}`)).toBeInTheDocument();
        expect(screen.getByText("Этап 1 из 6 · Слова урока: 0 из 5")).toBeInTheDocument();
    });

    it("на завершённом уроке не выходит за пределы плана и показывает счётчик слов", () => {
        render(<LessonGoalCard plan={{ ...PLAN, step: 6, wordsDone: 3, completed: true }} />);

        expect(screen.getByText("Этап 6 из 6 · Слова урока: 3 из 5")).toBeInTheDocument();
        // ARCHITECT: завершённый урок подписывается словом: числа уже показаны счётчиком.
        expect(screen.getByText("Урок завершён")).toBeInTheDocument();
    });

    it("счётчик слов показан без раскрытия списка", () => {
        render(<LessonGoalCard plan={{ ...PLAN, step: 4, wordsDone: 2 }} />);

        expect(screen.getByText("Этап 5 из 6 · Слова урока: 2 из 5")).toBeInTheDocument();
        // ARCHITECT: в карточке нет ни одного слова урока: список раскрывает только итоговый блок ленты (§16.6).
        expect(screen.queryByText("deadline")).not.toBeInTheDocument();
        expect(screen.queryByText(/^\d+\. /)).not.toBeInTheDocument();
    });

    it("целевых слов урока в карточке нет: контракт их не содержит", () => {
        render(<LessonGoalCard plan={PLAN} />);

        expect(Object.keys(PLAN)).not.toContain("targetWords");
        expect(screen.queryByText(/breakfast|deadline|trade-off/)).not.toBeInTheDocument();
    });
});
