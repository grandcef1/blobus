// ARCHITECT: план урока — детерминированный контент сервера: тест держит и состав (цель, правило, скрытые
// слова), и правила хода (шаг, серия, ротация активностей, не больше одной фишки), и запрет на утечку слов.

import { describe, expect, it } from "vitest";
import {
    ACTIVITIES_PER_LESSON,
    ACTIVITY_CYCLE,
    STREAK_THRESHOLD,
    activityAt,
    advancePlan,
    buildLessonPlan,
    perkFor,
    readLessonPlan,
    revealWord,
    toLessonPlanDto,
} from "./lessonPlan.ts";

const MODES = ["interview", "speaking", "grammar", "general"] as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

describe("buildLessonPlan", () => {
    it("детерминирован по уровню и режиму", () => {
        const first = buildLessonPlan({ level: "B1", mode: "speaking", locale: "ru" });
        const second = buildLessonPlan({ level: "B1", mode: "speaking", locale: "ru" });

        // ARCHITECT: в плане нет ни времени, ни случайности: два урока одного сочетания совпадают целиком.
        expect(second).toEqual(first);
        expect(first.targetWords).toHaveLength(5);
        expect(first.activities).toHaveLength(ACTIVITIES_PER_LESSON);
        expect(first.step).toBe(0);
    });

    it("уровень и режим меняют цель, правило и целевые слова", () => {
        const speaking = buildLessonPlan({ level: "A2", mode: "speaking", locale: "ru" });
        const interview = buildLessonPlan({ level: "A2", mode: "interview", locale: "ru" });
        const advanced = buildLessonPlan({ level: "C1", mode: "speaking", locale: "ru" });

        expect(interview.rule).not.toBe(speaking.rule);
        expect(advanced.targetWords).not.toEqual(speaking.targetWords);
        expect(advanced.goal).not.toBe(speaking.goal);
    });

    it("цель и правило локализованы по языку объяснений", () => {
        const ru = buildLessonPlan({ level: "B1", mode: "grammar", locale: "ru" });
        const en = buildLessonPlan({ level: "B1", mode: "grammar", locale: "en" });

        expect(ru.goal).not.toBe(en.goal);
        expect(en.goal).toContain("in two or three connected sentences");
    });

    it("активности идут по кругу: подряд не повторяются и за урок не возвращаются", () => {
        for (const level of LEVELS) {
            for (const mode of MODES) {
                const plan = buildLessonPlan({ level, mode, locale: "ru" });

                for (let index = 1; index < plan.activities.length; index += 1)
                    expect(plan.activities[index]).not.toBe(plan.activities[index - 1]);

                // ARCHITECT: план — отрезок круга длиной меньше самого круга, поэтому повторов в нём нет вовсе.
                expect(new Set(plan.activities).size).toBe(plan.activities.length);
                expect(plan.activities.every((id) => ACTIVITY_CYCLE.includes(id))).toBe(true);
            }
        }
    });
});

describe("advancePlan", () => {
    const plan = buildLessonPlan({ level: "B1", mode: "speaking", locale: "ru" });

    it("считает употреблённые целевые слова и пройденный шаг", () => {
        const [first, second] = plan.targetWords;
        const next = advancePlan(plan, {
            studentMessage: `I had a ${first} and a ${second}.`,
            hasError: false,
        });

        expect(next.usedWords).toEqual([first, second]);
        expect(next.step).toBe(1);
        // ARCHITECT: слово внутри другого слова счётчик не двигает: прогресс не растёт от случайных подстрок.
        expect(advancePlan(plan, { studentMessage: `xx${first}xx`, hasError: false }).usedWords).toEqual(
            []
        );
    });

    it("сохраняет порядок слов плана и не повторяет уже употреблённые", () => {
        const [first, second] = plan.targetWords;
        const once = advancePlan(plan, { studentMessage: `a ${second} thing`, hasError: false });
        const twice = advancePlan(once, { studentMessage: `${first} again`, hasError: false });

        expect(twice.usedWords).toEqual([first, second]);
        expect(advancePlan(twice, { studentMessage: first, hasError: false }).usedWords).toEqual([
            first,
            second,
        ]);
    });

    it("серия растёт без ошибок и сбрасывается значимой ошибкой", () => {
        const one = advancePlan(plan, { studentMessage: "ok", hasError: false });
        const two = advancePlan(one, { studentMessage: "ok", hasError: false });
        const broken = advancePlan(two, { studentMessage: "ok", hasError: true });

        expect(two.streak).toBe(2);
        expect(broken.streak).toBe(0);
    });

    it("завершает урок на последнем этапе и не уходит за границы плана", () => {
        let current = plan;

        for (let step = 0; step < ACTIVITIES_PER_LESSON; step += 1)
            current = advancePlan(current, { studentMessage: "ok", hasError: false });

        expect(current.step).toBe(ACTIVITIES_PER_LESSON);
        expect(current.completed).toBe(true);
        expect(advancePlan(current, { studentMessage: "ok", hasError: false }).step).toBe(
            ACTIVITIES_PER_LESSON
        );
        expect(activityAt(current)).toBe(current.activities[ACTIVITIES_PER_LESSON - 1]);
    });
});

describe("фишки хода", () => {
    const plan = buildLessonPlan({ level: "B1", mode: "speaking", locale: "ru" });

    it("на первом ходу фишки нет, на последнем — раскрытие слова урока", () => {
        expect(perkFor(plan)).toBeNull();

        let last = plan;

        while (last.step < ACTIVITIES_PER_LESSON - 1)
            last = advancePlan(last, { studentMessage: "ok", hasError: false });

        expect(perkFor(last)).toBe("reveal");
    });

    it("серия даёт свою фишку, а факт о языке — не раньше третьего хода", () => {
        expect(perkFor({ ...plan, streak: STREAK_THRESHOLD })).toBe("streak");
        expect(perkFor({ ...plan, streak: 0, step: 3 })).toBe("fact");
        expect(perkFor({ ...plan, streak: 0, step: 1 })).toBeNull();
    });

    it("раскрывается первое ещё не употреблённое слово, а после них — первое из плана", () => {
        const [first, second] = plan.targetWords;

        expect(revealWord({ ...plan, usedWords: [first] })).toBe(second);
        expect(revealWord({ ...plan, usedWords: [...plan.targetWords] })).toBe(first);
    });
});

describe("DTO плана", () => {
    it("не содержит целевых слов: наружу уходят только счётчики", () => {
        const plan = buildLessonPlan({ level: "C1", mode: "interview", locale: "ru" });
        const dto = toLessonPlanDto(plan);
        const encoded = JSON.stringify(dto);

        expect(Object.keys(dto).sort()).toEqual([
            "completed",
            "goal",
            "rule",
            "step",
            "total",
            "wordsDone",
            "wordsTotal",
        ]);
        for (const word of plan.targetWords) expect(encoded).not.toContain(word);
    });

    it("читает план из jsonb и отбрасывает чужую форму", () => {
        const plan = buildLessonPlan({ level: "A2", mode: "general", locale: "ru" });

        expect(readLessonPlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
        expect(readLessonPlan(null)).toBeNull();
        expect(readLessonPlan({ version: 2 })).toBeNull();
        expect(readLessonPlan({ ...plan, extra: "лишнее поле" })).toBeNull();
    });
});
