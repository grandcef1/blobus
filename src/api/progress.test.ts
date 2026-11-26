// ARCHITECT: ресурсный конверт { vocabulary } — новая точка отказа чтения, поэтому тест держит и мок-ветку,
// и распаковку. Паттерн моков — как в src/api/sessions.summaries.test.ts: apiFetch мокается точечно,
// real-режим через vi.stubEnv + vi.resetModules + динамический import. Фикстуры вымышленные, без PII.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    MOCK_VOCABULARY_ENTRIES,
    addVocabularyEntry,
    fetchVocabulary,
    fetchVocabularyEntries,
    markWordReviewed,
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
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(2);
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
describe("мок-режим: addVocabularyEntry пишет в мок-список", () => {
    it("5.1 добавляет слово в MOCK_VOCABULARY_ENTRIES и не ходит в apiFetch", async () => {
        const before = MOCK_VOCABULARY_ENTRIES.length;
        const entry = await addVocabularyEntry({ term: "Serendipity", translation: "озарение" });

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(entry.term).toBe("Serendipity");
        expect(entry.translation).toBe("озарение");
        expect(entry.context).toBeNull();
        expect(entry.exampleTranslation).toBeNull();
        expect(entry.sourceLessonId).toBeNull();
        expect(Object.keys(entry).sort()).toEqual([
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
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(before + 1);
        expect(MOCK_VOCABULARY_ENTRIES.some((item) => item.id === entry.id)).toBe(true);
    });

    it("5.6 кладёт перевод примера в мок-запись", async () => {
        // ARCHITECT: термин уникален для этого теста: дубль по lower(term) вернул бы запись 5.1 без перевода.
        const entry = await addVocabularyEntry({
            term: "Tenacity",
            context: "Her tenacity impressed the team.",
            exampleTranslation: "Её упорство впечатлило команду.",
        });

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(entry.exampleTranslation).toBe("Её упорство впечатлило команду.");
        expect(
            MOCK_VOCABULARY_ENTRIES.find((item) => item.id === entry.id)?.exampleTranslation
        ).toBe("Её упорство впечатлило команду.");
    });

    it("5.2 дубль по lower(term): та же запись, длина списка не растёт", async () => {
        const created = await addVocabularyEntry({ term: "Serendipity" });
        const before = MOCK_VOCABULARY_ENTRIES.length;
        const duplicate = await addVocabularyEntry({ term: "  serendipity " });

        expect(duplicate.id).toBe(created.id);
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(before);
    });
});

describe("real-режим: addVocabularyEntry создаёт слово через доменный роутер", () => {
    const created: VocabularyEntryDto = {
        id: "a1b2c3d4-0005-4000-8000-000000000005",
        term: "serendipity",
        translation: "озарение",
        context: "A happy accident.",
        exampleTranslation: "Счастливая случайность.",
        sourceLessonId: null,
        stage: 1,
        nextDueAt: "2026-11-22T10:00:00.000Z",
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

    it("5.3 POST /vocabulary с телом и распаковка .entry", async () => {
        apiFetchMock.mockResolvedValue({ entry: created });
        const progress = await loadRealProgress();
        const input = {
            term: "serendipity",
            translation: "озарение",
            context: "A happy accident.",
            exampleTranslation: "Счастливая случайность.",
        };

        const result = await progress.addVocabularyEntry(input);

        expect(result).toEqual(created);
        expect(result.exampleTranslation).toBe("Счастливая случайность.");
        // ARCHITECT: тело уходит объектом — apiFetch сериализует сам; строка была бы JSON внутри JSON.
        expect(apiFetchMock).toHaveBeenCalledWith("/vocabulary", {
            method: "POST",
            body: input,
        });
    });

    it("5.4 пробрасывает 400, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(400, "Request could not be processed"));
        const progress = await loadRealProgress();

        await expect(progress.addVocabularyEntry({ term: "serendipity" })).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it("5.5 пробрасывает 401 и 403, не глотая их", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock
            .mockRejectedValueOnce(new ApiError(401, "Unauthorized"))
            .mockRejectedValueOnce(new ApiError(403, "Request forbidden"));
        const progress = await loadRealProgress();

        await expect(progress.addVocabularyEntry({ term: "serendipity" })).rejects.toMatchObject({
            statusCode: 401,
        });
        await expect(progress.addVocabularyEntry({ term: "serendipity" })).rejects.toMatchObject({
            statusCode: 403,
        });
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
