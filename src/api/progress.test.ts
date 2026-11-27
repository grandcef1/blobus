// ARCHITECT: ресурсный конверт { vocabulary } — новая точка отказа чтения, поэтому тест держит и мок-ветку,
// и распаковку. Паттерн моков — как в src/api/sessions.summaries.test.ts: apiFetch мокается точечно,
// real-режим через vi.stubEnv + vi.resetModules + динамический import. Фикстуры вымышленные, без PII.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    MOCK_VOCABULARY_ENTRIES,
    fetchReviewQueue,
    fetchVocabulary,
    fetchVocabularyEntries,
    markWordReviewed,
    normalizeProgressDto,
} from "@/api/progress";
import type { VocabularyEntryDto } from "@/api/progress";
import { MOCK_VOCABULARY } from "@/api/mocks/progress";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

describe("мок-режим: fetchVocabularyEntries отдаёт адаптерный мок", () => {
    it("6.1 резолвится в MOCK_VOCABULARY_ENTRIES и не ходит в apiFetch", async () => {
        const entries = await fetchVocabularyEntries();

        expect(entries).toEqual(MOCK_VOCABULARY_ENTRIES);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });

    it("6.6 прежние мок-экспорты прогресса и словаря не изменились", async () => {
        await expect(fetchVocabulary()).resolves.toEqual(MOCK_VOCABULARY);
        // ARCHITECT: четыре слова: два исходных плюс пара с переводами — без них очередь повторения пуста.
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(4);
    });
});

describe("real-режим: fetchVocabularyEntries читает ресурсный конверт", () => {
    const fixture: VocabularyEntryDto[] = [
        {
            id: "a1b2c3d4-0001-4000-8000-000000000001",
            term: "collaborate",
            translation: "сотрудничать",
            context: "We need to collaborate on this project.",
            exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
            sourceLessonId: null,
            stage: 1,
            nextDueAt: "2026-11-19T08:00:00.000Z",
            createdAt: "2026-11-19T08:00:00.000Z",
            updatedAt: "2026-11-19T08:00:00.000Z",
        },
        {
            id: "a1b2c3d4-0002-4000-8000-000000000002",
            term: "deadline",
            translation: null,
            context: null,
            exampleTranslation: null,
            sourceLessonId: "a1b2c3d4-0003-4000-8000-000000000003",
            stage: 2,
            nextDueAt: "2026-11-20T09:40:00.000Z",
            createdAt: "2026-11-17T14:12:00.000Z",
            updatedAt: "2026-11-18T09:40:00.000Z",
        },
    ];

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

    /** Модуль подгружается заново под реальный VITE_USE_MOCKS=false. */
    function loadRealProgress(): Promise<typeof import("@/api/progress")> {
        return import("@/api/progress");
    }

    it("6.2 вызывает /vocabulary и распаковывает .vocabulary без изменений", async () => {
        apiFetchMock.mockResolvedValue({ vocabulary: fixture });
        const progress = await loadRealProgress();

        const result = await progress.fetchVocabularyEntries();

        expect(result).toEqual(fixture);
        expect(apiFetchMock).toHaveBeenCalledWith("/vocabulary");
        // ARCHITECT: контракт без pronunciation/mastery/examples и без user_id — ключи DTO ровно эти.
        expect(Object.keys(result[0]).sort()).toEqual([
            "context",
            "createdAt",
            "exampleTranslation",
            "id",
            "nextDueAt",
            "sourceLessonId",
            "stage",
            "term",
            "translation",
            "updatedAt",
        ]);
        expect(result[0].exampleTranslation).toBe("Нам нужно сотрудничать над этим проектом.");
        expect(result[1].translation).toBeNull();
        expect(result[1].context).toBeNull();
        expect(result[1].exampleTranslation).toBeNull();
    });

    it("6.3 пустой конверт { vocabulary: [] } даёт пустой массив", async () => {
        apiFetchMock.mockResolvedValue({ vocabulary: [] });
        const progress = await loadRealProgress();

        await expect(progress.fetchVocabularyEntries()).resolves.toEqual([]);
    });

    it("6.4 пробрасывает 401, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const progress = await loadRealProgress();

        await expect(progress.fetchVocabularyEntries()).rejects.toThrow();
    });

    it("6.5 пробрасывает 500, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(500, "Internal server error"));
        const progress = await loadRealProgress();

        await expect(progress.fetchVocabularyEntries()).rejects.toThrow();
    });
});

describe("мок-режим: fetchReviewQueue собирает задания из мок-словаря", () => {
    it("7.1 отдаёт задание выбора перевода: верный вариант один, дистракторы его не повторяют", async () => {
        const queue = await fetchReviewQueue();
        const first = queue[0];

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(queue.length).toBeGreaterThan(0);

        if (first === undefined || first.task.type !== "choice")
            throw new Error("ожидалось задание выбора");

        const task = first.task;
        const correct = task.options.find((option) => option.id === task.answerId);
        const others = task.options.filter((option) => option.id !== task.answerId);

        expect(correct).toBeDefined();
        expect(others.length).toBeGreaterThan(0);

        // ARCHITECT: дистрактор, совпавший с верным переводом, сделал бы задание угадыванием (§спец. 5).
        for (const option of others) expect(option.text).not.toBe(correct?.text);
    });

    it("7.2 очередь детерминирована: два вызова дают одну и ту же форму", async () => {
        expect(await fetchReviewQueue()).toEqual(await fetchReviewQueue());
    });
});

describe("real-режим: fetchReviewQueue читает готовые задания с сервера", () => {
    const ITEM = {
        id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11",
        stage: 2,
        task: {
            type: "gap-fill",
            prompt: "We need to ___ on this project.",
            answer: "collaborate",
        },
    } as const;

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

    it("7.3 распаковывает конверт { queue }: задание собирает сервер, а не клиент", async () => {
        apiFetchMock.mockResolvedValue({ queue: [ITEM] });
        const progress = await import("@/api/progress");

        expect(await progress.fetchReviewQueue()).toEqual([ITEM]);
        expect(apiFetchMock).toHaveBeenCalledWith("/vocabulary/review");
    });

    it("7.4 пробрасывает 401, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const progress = await import("@/api/progress");

        await expect(progress.fetchReviewQueue()).rejects.toMatchObject({ statusCode: 401 });
    });
});

/** Допуск на время выполнения: nextDueAt сверяется окном ±1 минута. */
const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_TOLERANCE_MS = 60 * 1000;

/** Проверяет, что nextDueAt отстоит от «сейчас» на days дней с допуском на время выполнения. */
function expectDueInDays(nextDueAt: string, days: number): void {
    const delta = Date.parse(nextDueAt) - Date.now();

    expect(Math.abs(delta - days * DAY_MS)).toBeLessThan(DUE_TOLERANCE_MS);
}

describe("мок-режим: markWordReviewed двигает шаг Лейтнера", () => {
    const REMEMBERED_ID = "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11";
    const FORGOTTEN_ID = "7e2b4c91-5d68-4a3f-8b1c-2f9a0d7e6b22";

    /** Ставит фикстурам известный шаг: тесты мока делят один массив, поэтому состояние сбрасывается. */
    function seed(stage: number): void {
        const remembered = MOCK_VOCABULARY_ENTRIES.find((item) => item.id === REMEMBERED_ID);
        const forgotten = MOCK_VOCABULARY_ENTRIES.find((item) => item.id === FORGOTTEN_ID);

        if (remembered === undefined || forgotten === undefined)
            throw new Error("фикстура мока потеряна");

        remembered.stage = stage;
        forgotten.stage = 3;
    }

    beforeEach(() => {
        seed(1);
    });

    it("8.1 «помню»: шаг 1 -> 2, nextDueAt через 3 дня, apiFetch не тронут", async () => {
        const entry = await markWordReviewed(REMEMBERED_ID, "remembered");

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(entry.stage).toBe(2);
        expectDueInDays(entry.nextDueAt, 3);
        expect(MOCK_VOCABULARY_ENTRIES.find((item) => item.id === REMEMBERED_ID)?.stage).toBe(2);
    });

    it("8.2 «забыл»: шаг 3 -> 1, nextDueAt через 1 день", async () => {
        const entry = await markWordReviewed(FORGOTTEN_ID, "forgotten");

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(entry.stage).toBe(1);
        expectDueInDays(entry.nextDueAt, 1);
        expect(MOCK_VOCABULARY_ENTRIES.find((item) => item.id === FORGOTTEN_ID)?.stage).toBe(1);
    });

    it("8.3 неизвестный id — бросает и не трогает список", async () => {
        const before = MOCK_VOCABULARY_ENTRIES.length;

        await expect(
            markWordReviewed("a1b2c3d4-0009-4000-8000-000000000009", "remembered")
        ).rejects.toThrow();
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(before);
    });
});

describe("real-режим: markWordReviewed пишет исход через доменный роутер", () => {
    const reviewed: VocabularyEntryDto = {
        id: "a1b2c3d4-0006-4000-8000-000000000006",
        term: "collaborate",
        translation: "сотрудничать",
        context: "We need to collaborate on this project.",
        exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
        sourceLessonId: null,
        stage: 2,
        nextDueAt: "2026-11-25T10:00:00.000Z",
        createdAt: "2026-11-22T10:00:00.000Z",
        updatedAt: "2026-11-22T10:00:00.000Z",
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

    /** Модуль подгружается заново под реальный VITE_USE_MOCKS=false. */
    function loadRealProgress(): Promise<typeof import("@/api/progress")> {
        return import("@/api/progress");
    }

    it("8.4 PATCH /vocabulary/<id> с телом { reviewed } и распаковка .entry", async () => {
        apiFetchMock.mockResolvedValue({ entry: reviewed });
        const progress = await loadRealProgress();

        const result = await progress.markWordReviewed(reviewed.id, "remembered");

        expect(result).toEqual(reviewed);
        expect(apiFetchMock).toHaveBeenCalledWith(`/vocabulary/${reviewed.id}`, {
            method: "PATCH",
            body: { reviewed: "remembered" },
        });
    });

    it("8.5 пробрасывает 400 и 404, не глотая их", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock
            .mockRejectedValueOnce(new ApiError(400, "Request could not be validated"))
            .mockRejectedValueOnce(new ApiError(404, "Resource not found"));
        const progress = await loadRealProgress();

        await expect(progress.markWordReviewed(reviewed.id, "remembered")).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(progress.markWordReviewed(reviewed.id, "forgotten")).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});

describe("normalizeProgressDto: частичный payload старого API", () => {
    it("8.1 сохраняет пришедшие поля и добивает отсутствующие фолбэками", () => {
        const normalized = normalizeProgressDto({
            level: "B1",
            score: 71,
            sessionsTotal: 3,
            recentSessions: [
                { id: "a1b2c3d4-0001-4000-8000-000000000001", tutorId: "miya", mode: "speaking" },
            ],
        });

        expect(normalized).not.toBeNull();
        expect(normalized?.level).toBe("B1");
        expect(normalized?.score).toBe(71);
        expect(normalized?.sessionsTotal).toBe(3);
        // отсутствующие поля получают фолбэк, а не undefined: рендер не падает и не показывает «undefined»
        expect(normalized?.messagesTotal).toBe(0);
        expect(normalized?.wordsTotal).toBe(0);
        expect(normalized?.wordsDueToday).toBe(0);
        expect(normalized?.streakDays).toBe(0);
        expect(normalized?.weeklyActivity).toEqual([]);
        // сессия без title сохраняется: заголовок соберёт getSessionTitle
        expect(normalized?.recentSessions).toHaveLength(1);
        expect(normalized?.recentSessions[0]?.title).toBeNull();
    });

    it("8.2 мусор в полях не проходит: уровни, числа и элементы массивов проверяются", () => {
        const normalized = normalizeProgressDto({
            level: "Z9",
            score: "71",
            sessionsTotal: Number.NaN,
            weeklyActivity: [{ date: "2026-11-18", messages: 4 }, { messages: 9 }, "мусор"],
            recentSessions: [
                { tutorId: "miya" },
                { id: "a1b2c3d4-0002-4000-8000-000000000002", tutorId: "nova" },
            ],
        });

        expect(normalized?.level).toBeNull();
        expect(normalized?.score).toBeNull();
        expect(normalized?.sessionsTotal).toBe(0);
        // день без даты и строка без id отбрасываются, а не превращаются в NaN или битую ссылку
        expect(normalized?.weeklyActivity).toEqual([{ date: "2026-11-18", messages: 4 }]);
        expect(normalized?.recentSessions).toHaveLength(1);
        expect(normalized?.recentSessions[0]?.id).toBe("a1b2c3d4-0002-4000-8000-000000000002");
    });

    it("8.3 не-объект даёт null: экран покажет ошибку с повтором, а не пустой прогресс", () => {
        expect(normalizeProgressDto(null)).toBeNull();
        expect(normalizeProgressDto("progress")).toBeNull();
        expect(normalizeProgressDto(42)).toBeNull();
    });
});
