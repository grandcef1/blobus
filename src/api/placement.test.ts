// ARCHITECT: адаптер серверного placement — двойная реализация по образцу profile.test.ts: мок-ветка работает
// на фикстуре fixed-30, real-ветка идёт через apiFetch (cookie-сессия, CSRF и 401→refresh внутри транспорта).
// Мок-состояние живёт в модуле, поэтому тесты, которым нужен чистый старт, перезагружают реестр модулей.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    FIXED_PLACEMENT_KEY,
    FIXED_PLACEMENT_QUESTIONS,
    scoreFixedPlacement,
} from "@/api/mocks/placementFixed";
import type { PlacementAnswerDto, PlacementResultDto } from "@/types/placement";

// ARCHITECT: apiFetch мокается точечно, ApiError остаётся настоящим: real-ветка проверяет проброс ошибок,
// не поднимая сеть.
const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

const TOTAL = 30;
const QUESTION_KEYS = ["id", "level", "options", "prompt", "skill"];
const OPTION_KEYS = ["id", "text"];
const RESULT_KEYS = ["createdAt", "level", "score"];

/** Полный комплект ответов формы: первые `correct` верны, остальные — заведомо неверны (сдвиг варианта). */
function answers(correct: number): readonly PlacementAnswerDto[] {
    return FIXED_PLACEMENT_QUESTIONS.map((question, index) => {
        const key = FIXED_PLACEMENT_KEY[question.id];

        return { questionId: question.id, choice: index < correct ? key : (key + 1) % 4 };
    });
}

/** Свежий модуль адаптера: мок-состояние (`mockFixedResult`) сбрасывается вместе с реестром модулей. */
function loadAdapter(): Promise<typeof import("@/api/placement")> {
    return import("@/api/placement");
}

describe("фикстура fixed-30", () => {
    it("30 заданий, по 2 grammar и 3 general на уровень, без верных ответов и кириллицы", () => {
        expect(FIXED_PLACEMENT_QUESTIONS).toHaveLength(TOTAL);
        expect(new Set(FIXED_PLACEMENT_QUESTIONS.map((question) => question.id)).size).toBe(TOTAL);
        expect(Object.keys(FIXED_PLACEMENT_KEY)).toHaveLength(TOTAL);

        for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
            const group = FIXED_PLACEMENT_QUESTIONS.filter((question) => question.level === level);

            expect(group).toHaveLength(5);
            expect(group.filter((question) => question.skill === "grammar")).toHaveLength(2);
            expect(group.filter((question) => question.skill === "general")).toHaveLength(3);
        }

        // ARCHITECT: банк English-only, поэтому форма безопасна для en/es (C-0d2b). Regex в escape-форме.
        const cyrillic = /[\u0400-\u04FF]/;

        for (const question of FIXED_PLACEMENT_QUESTIONS) {
            expect(question.options).toHaveLength(4);
            expect(new Set(question.options.map((option) => option.text)).size).toBe(4);
            expect(cyrillic.test(question.prompt)).toBe(false);
            expect(question.options.some((option) => cyrillic.test(option.text))).toBe(false);
            expect(FIXED_PLACEMENT_KEY[question.id]).toBeGreaterThanOrEqual(0);
            expect(FIXED_PLACEMENT_KEY[question.id]).toBeLessThanOrEqual(3);
        }

        // ARCHITECT: публичная форма ответа не содержит — ни полей, ни слов из их имён.
        expect(JSON.stringify(FIXED_PLACEMENT_QUESTIONS)).not.toMatch(
            /correctIndex|correctOptionId|explanation/
        );
    });
});

describe("скоринг фикстуры", () => {
    it("серверные полосы и округление, включая 0 и 100", () => {
        // ARCHITECT: 0-19 A1, 20-39 A2, 40-59 B1, 60-74 B2, 75-89 C1, 90-100 C2 — границы из серверного файла.
        const cases: readonly (readonly [number, number, string])[] = [
            [0, 0, "A1"],
            // 5 из 30 — 16.67, округление вверх до 17 и нижняя полоса.
            [5, 17, "A1"],
            [6, 20, "A2"],
            [12, 40, "B1"],
            [18, 60, "B2"],
            // 23 из 30 — 76.67: округление и переход в C1.
            [23, 77, "C1"],
            [27, 90, "C2"],
            [30, 100, "C2"],
        ];

        for (const [correct, score, level] of cases) {
            expect(scoreFixedPlacement(answers(correct))).toEqual({ score, level });
        }

        // ARCHITECT: знаменатель — отправленные ответы, поэтому одни верные ответы дают 100 даже подмножеством
        // (маршрут требует полный комплект, здесь проверяется только формула фикстуры).
        expect(scoreFixedPlacement(answers(3).slice(0, 3))).toEqual({ score: 100, level: "C2" });
        expect(scoreFixedPlacement([])).toEqual({ score: 0, level: "A1" });
    });
});
describe("мок-режим: адаптер fixed-30", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        apiFetchMock.mockReset();
        vi.resetModules();
        vi.restoreAllMocks();
    });

    it("fetchPlacementQuestions отдаёт 30 вопросов без полей ответа и не ходит в apiFetch", async () => {
        const [placement, fixture] = await Promise.all([
            import("@/api/placement"),
            import("@/api/mocks/placementFixed"),
        ]);
        const questions = await placement.fetchPlacementQuestions();

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(questions).toHaveLength(TOTAL);

        for (const question of questions) {
            expect(Object.keys(question).sort()).toEqual(QUESTION_KEYS);

            for (const option of question.options) {
                expect(Object.keys(option).sort()).toEqual(OPTION_KEYS);
            }
        }

        // ARCHITECT: форма совпадает с фикстурой, но отдаётся копией — правка ответа не меняет сам банк.
        expect(questions).toEqual(fixture.FIXED_PLACEMENT_QUESTIONS);
        expect(questions).not.toBe(fixture.FIXED_PLACEMENT_QUESTIONS);
    });

    it("submitPlacementAnswers считает балл сам и отдаёт DTO результата", async () => {
        const placement = await loadAdapter();
        const result = await placement.submitPlacementAnswers(answers(18));

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(result.score).toBe(60);
        expect(result.level).toBe("B2");
        expect(Object.keys(result).sort()).toEqual(RESULT_KEYS);
        expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false);
    });

    it("повторная отправка идемпотентна: другой набор ответов результат не меняет", async () => {
        const placement = await loadAdapter();
        const first = await placement.submitPlacementAnswers(answers(12));
        const second = await placement.submitPlacementAnswers(answers(30));

        expect(first.score).toBe(40);
        expect(second).toEqual(first);
    });

    it("fetchPlacementResultDto: null до отправки и сохранённый результат после", async () => {
        const placement = await loadAdapter();

        expect(await placement.fetchPlacementResultDto()).toBeNull();

        const submitted = await placement.submitPlacementAnswers(answers(15));

        expect(await placement.fetchPlacementResultDto()).toEqual(submitted);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });
});
describe("real-режим: контракт сервера", () => {
    const result: PlacementResultDto = {
        level: "B1",
        score: 47,
        createdAt: "2026-12-02T10:00:00.000Z",
    };

    beforeEach(() => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        vi.resetModules();
    });

    afterEach(() => {
        apiFetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.resetModules();
        vi.restoreAllMocks();
    });

    it("fetchPlacementQuestions: GET /placement и распаковка .questions", async () => {
        apiFetchMock.mockResolvedValue({
            questions: FIXED_PLACEMENT_QUESTIONS,
            completed: false,
            result: null,
        });
        const placement = await loadAdapter();

        const questions = await placement.fetchPlacementQuestions();

        expect(apiFetchMock).toHaveBeenCalledWith("/placement");
        expect(questions).toHaveLength(TOTAL);
        expect(questions[0]).toEqual(FIXED_PLACEMENT_QUESTIONS[0]);
        expect(Object.keys(questions[0] ?? {}).sort()).toEqual(QUESTION_KEYS);
    });

    it("fetchPlacementResultDto: серверный result: null превращается в null", async () => {
        apiFetchMock.mockResolvedValue({ questions: [], completed: false, result: null });
        const placement = await loadAdapter();

        expect(await placement.fetchPlacementResultDto()).toBeNull();
        expect(apiFetchMock).toHaveBeenCalledWith("/placement");
    });

    it("fetchPlacementResultDto: свой результат из конверта, только поля DTO", async () => {
        apiFetchMock.mockResolvedValue({ questions: [], completed: true, result });
        const placement = await loadAdapter();

        const own = await placement.fetchPlacementResultDto();

        expect(own).toEqual(result);
        expect(Object.keys(own ?? {}).sort()).toEqual(RESULT_KEYS);
    });

    it("submitPlacementAnswers: POST /placement с телом-объектом и распаковка .result", async () => {
        apiFetchMock.mockResolvedValue({ result });
        const placement = await loadAdapter();
        const payload = answers(12);

        const outcome = await placement.submitPlacementAnswers(payload);

        expect(outcome).toEqual(result);
        expect(Object.keys(outcome).sort()).toEqual(RESULT_KEYS);
        // ARCHITECT: тело уходит объектом — apiFetch сериализует сам; строка была бы JSON внутри JSON.
        expect(apiFetchMock).toHaveBeenCalledWith("/placement", {
            method: "POST",
            body: { answers: payload },
        });
    });

    it("пробрасывает 400, 401 и 403, не глотая их", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock
            .mockRejectedValueOnce(new ApiError(400, "Request could not be processed"))
            .mockRejectedValueOnce(new ApiError(401, "Unauthorized"))
            .mockRejectedValueOnce(new ApiError(403, "Request forbidden"));
        const placement = await loadAdapter();

        await expect(placement.submitPlacementAnswers(answers(0))).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(placement.fetchPlacementQuestions()).rejects.toMatchObject({
            statusCode: 401,
        });
        await expect(placement.fetchPlacementResultDto()).rejects.toMatchObject({
            statusCode: 403,
        });
    });
});
