// ARCHITECT: генератор задания повторения — чистый код, поэтому проверяется без БД и без сети: тип задания
// выбирается по шагу и данным, дистракторы не совпадают с верным ответом, а форма всегда проходит схему
// викторины — то, что схема не примет, клиент не отрисует, и наружу такое уходить не должно (§16.6).

import { describe, expect, it } from "vitest";
import { QuizSchema } from "./chat/contract.ts";
import { buildReviewQueue, buildReviewTask } from "./vocabularyReview.ts";
import type { ReviewWord } from "./vocabularyReview.ts";

const WORD: ReviewWord = {
    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11",
    term: "collaborate",
    translation: "сотрудничать",
    context: "We need to collaborate on this project.",
    stage: 1,
};

const OTHERS: readonly ReviewWord[] = [
    { id: "7e2b4c91-5d68-4a3f-8b1c-2f9a0d7e6b22", term: "deadline", translation: "срок", context: null, stage: 1 },
    { id: "9f4c2a10-3b7e-4d51-a0c8-4e2b1d6f7a33", term: "improve", translation: "улучшать", context: null, stage: 1 },
    { id: "b6d1f0a4-7c92-4e38-9a15-3f8c5b2d9e44", term: "reliable", translation: "надёжный", context: null, stage: 1 },
];

const ALL: readonly ReviewWord[] = [WORD, ...OTHERS];

describe("buildReviewTask", () => {
    it("пропуск в примере: слово вырезано из предложения, а не показано целиком", () => {
        const task = buildReviewTask(WORD, ALL);

        if (task?.type !== "gap-fill") throw new Error("ожидалось задание с пропуском");

        expect(task.answer).toBe(WORD.term);
        expect(task.prompt).toBe("We need to ___ on this project.");
        expect(task.prompt).not.toContain(WORD.term);
    });

    it("без примера на раннем шаге даёт выбор перевода: верный один, дистракторы его не повторяют", () => {
        const withoutContext: ReviewWord = { ...WORD, context: null };
        const task = buildReviewTask(withoutContext, [withoutContext, ...OTHERS]);

        if (task?.type !== "choice") throw new Error("ожидалось задание выбора");

        expect(task.prompt).toBe(WORD.term);
        expect(task.options).toHaveLength(3);

        const correct = task.options.find((option) => option.id === task.answerId);

        expect(correct?.text).toBe(WORD.translation);

        // ARCHITECT: дистрактор, совпавший с верным переводом, сделал бы задание угадыванием (§спец. 5).
        for (const option of task.options.filter((item) => item.id !== task.answerId))
            expect(option.text).not.toBe(WORD.translation);
    });

    it("на позднем шаге собирает предложение из слов примера", () => {
        const task = buildReviewTask({ ...WORD, stage: 4 }, ALL);

        if (task?.type !== "word-order") throw new Error("ожидалось задание порядка слов");

        expect(task.answer).toBe(WORD.context);
        expect(task.words.join(" ")).toBe(WORD.context);
        expect(task.prompt).toBe(WORD.translation);
    });

    it("без перевода и без примера задания нет: слово пропускается, а не рисуется пустым", () => {
        const bare: ReviewWord = { ...WORD, translation: null, context: null };

        expect(buildReviewTask(bare, [bare])).toBeNull();
    });

    it("без примера, но с переводом даёт пропуск по подсказке и детерминирован", () => {
        const withoutContext: ReviewWord = { ...WORD, context: null };

        expect(buildReviewTask(withoutContext, [withoutContext])).toEqual({
            type: "gap-fill",
            prompt: "___ — сотрудничать",
            answer: "collaborate",
        });
        expect(buildReviewTask(withoutContext, [withoutContext])).toEqual(
            buildReviewTask(withoutContext, [withoutContext])
        );
    });

    it("пример без самого слова не даёт пропуска: тип падает до выбора перевода", () => {
        const task = buildReviewTask({ ...WORD, context: "Another sentence." }, ALL);

        expect(task?.type).toBe("choice");
    });

    it("слишком длинный пример не выдаёт задание за границами схемы викторины", () => {
        const long: ReviewWord = { ...WORD, context: `${"word ".repeat(80)}collaborate` };
        const task = buildReviewTask(long, [long, ...OTHERS]);

        // ARCHITECT: длинный пример отсекается, и слово повторяется более простым заданием — но всегда по схеме.
        expect(task?.type).toBe("choice");
        expect(QuizSchema.safeParse(task).success).toBe(true);
    });
});

describe("buildReviewQueue", () => {
    it("держит порядок слов, ограничивает размер и пропускает слова без задания", () => {
        const bare: ReviewWord = { ...WORD, id: "c1", term: "hm", translation: null, context: null };
        const queue = buildReviewQueue([WORD, bare, ...OTHERS], 3);

        expect(queue.map((item) => item.id)).toEqual([WORD.id, OTHERS[0].id, OTHERS[1].id]);
        expect(queue).toHaveLength(3);

        for (const item of queue) expect(QuizSchema.safeParse(item.task).success).toBe(true);
    });

    it("детерминирована: тот же словарь даёт ту же очередь", () => {
        expect(buildReviewQueue(ALL, 10)).toEqual(buildReviewQueue(ALL, 10));
    });
});
