// ARCHITECT: ресурсный конверт { vocabulary } — новая точка отказа чтения, поэтому тест держит и мок-ветку,
// и распаковку. Паттерн моков — как в src/api/sessions.summaries.test.ts: apiFetch мокается точечно,
// real-режим через vi.stubEnv + vi.resetModules + динамический import. Фикстуры вымышленные, без PII.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    MOCK_VOCABULARY_ENTRIES,
    addVocabularyEntry,
    fetchVocabulary,
    fetchVocabularyEntries,
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
            sourceLessonId: null,
            createdAt: "2026-11-19T08:00:00.000Z",
            updatedAt: "2026-11-19T08:00:00.000Z",
        },
        {
            id: "a1b2c3d4-0002-4000-8000-000000000002",
            term: "deadline",
            translation: null,
            context: null,
            sourceLessonId: "a1b2c3d4-0003-4000-8000-000000000003",
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
            "id",
            "sourceLessonId",
            "term",
            "translation",
            "updatedAt",
        ]);
        expect(result[1].translation).toBeNull();
        expect(result[1].context).toBeNull();
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
        expect(entry.sourceLessonId).toBeNull();
        expect(Object.keys(entry).sort()).toEqual([
            "context",
            "createdAt",
            "id",
            "sourceLessonId",
            "term",
            "translation",
            "updatedAt",
        ]);
        expect(MOCK_VOCABULARY_ENTRIES).toHaveLength(before + 1);
        expect(MOCK_VOCABULARY_ENTRIES.some((item) => item.id === entry.id)).toBe(true);
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
        sourceLessonId: null,
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
        };

        const result = await progress.addVocabularyEntry(input);

        expect(result).toEqual(created);
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
