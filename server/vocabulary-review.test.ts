// ARCHITECT: чистая логика повторения проверяется без БД и HTTP: переход по шагам Лейтнера — единственное
// место, где может тихо разъехаться контракт интервалов, поэтому негативы (невалидный шаг) тоже закреплены.
import { describe, expect, it } from "vitest";

import {
    PINNED_INTERVAL_DAYS,
    REVIEW_INTERVAL_DAYS,
    REVIEW_MAX_STAGE,
    computeNextReview,
} from "./routes/vocabulary.ts";

describe("computeNextReview: «помню» двигает шаг вперёд", () => {
    it("4.1 шаг 1 -> шаг 2, интервал 3 дня", () => {
        expect(computeNextReview(1, "remembered")).toEqual({ stage: 2, intervalDays: 3 });
    });

    it("4.2 шаг 2 -> шаг 3, интервал 7 дней", () => {
        expect(computeNextReview(2, "remembered")).toEqual({ stage: 3, intervalDays: 7 });
    });

    it("4.3 шаг 3 -> шаг 4, интервал 14 дней", () => {
        expect(computeNextReview(3, "remembered")).toEqual({ stage: 4, intervalDays: 14 });
    });

    it("4.4 шаг 4 -> шаг 5, интервал 30 дней", () => {
        expect(computeNextReview(4, "remembered")).toEqual({ stage: 5, intervalDays: 30 });
    });

    it("4.5 шаг 5 закреплён: остаётся пятым и повторяется через 90 дней", () => {
        expect(computeNextReview(5, "remembered")).toEqual({ stage: 5, intervalDays: 90 });
    });
});

describe("computeNextReview: «забыл» возвращает на первый шаг", () => {
    it("4.6 шаг 3 -> шаг 1, интервал 1 день", () => {
        expect(computeNextReview(3, "forgotten")).toEqual({ stage: 1, intervalDays: 1 });
    });

    it("4.7 шаг 1 -> шаг 1, интервал 1 день", () => {
        expect(computeNextReview(1, "forgotten")).toEqual({ stage: 1, intervalDays: 1 });
    });

    it("4.8 шаг 5 -> шаг 1, интервал 1 день", () => {
        expect(computeNextReview(5, "forgotten")).toEqual({ stage: 1, intervalDays: 1 });
    });
});

describe("computeNextReview: негативы", () => {
    it("4.9 шаг 0 вне диапазона — бросает", () => {
        expect(() => computeNextReview(0, "remembered")).toThrow();
    });

    it("4.10 шаг 6 вне диапазона — бросает", () => {
        expect(() => computeNextReview(6, "forgotten")).toThrow();
    });

    it("4.11 дробный шаг — бросает", () => {
        expect(() => computeNextReview(1.5, "remembered")).toThrow();
    });

    it("4.12 константы совпадают с ТЗ: пять шагов, интервалы 1/3/7/14/30, закрепление 90", () => {
        expect(REVIEW_MAX_STAGE).toBe(5);
        expect(REVIEW_INTERVAL_DAYS).toEqual([1, 3, 7, 14, 30]);
        expect(PINNED_INTERVAL_DAYS).toBe(90);
    });
});
