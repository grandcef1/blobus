// ARCHITECT: ресурсный конверт { sessions } — новая точка отказа: тест держит и мок-ветку, и распаковку.
// Паттерн моков — как в src/api/profile.test.ts: apiFetch мокается точечно, real-режим через
// vi.stubEnv + vi.resetModules + динамический import. Фикстуры вымышленные, без PII.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_SESSION_SUMMARIES, fetchSessionSummaries } from "@/api/sessions";
import type { SessionSummaryDto } from "@/api/sessions";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

describe("мок-режим: fetchSessionSummaries отдаёт адаптерный мок", () => {
    it("6.1 резолвится в MOCK_SESSION_SUMMARIES и не ходит в apiFetch", async () => {
        const summaries = await fetchSessionSummaries();

        expect(summaries).toEqual(MOCK_SESSION_SUMMARIES);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });
});

describe("real-режим: fetchSessionSummaries читает ресурсный конверт", () => {
    const fixture: SessionSummaryDto[] = [
        {
            id: "a1b2c3d4-0001-4000-8000-000000000001",
            tutorId: "miya",
            mode: "speaking",
            createdAt: "2026-11-19T08:00:00.000Z",
            updatedAt: "2026-11-19T08:31:00.000Z",
        },
        {
            id: "a1b2c3d4-0002-4000-8000-000000000002",
            tutorId: "nova",
            mode: "interview",
            createdAt: "2026-11-17T14:12:00.000Z",
            updatedAt: "2026-11-17T14:48:00.000Z",
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
    function loadRealSummaries(): Promise<typeof import("@/api/sessions")> {
        return import("@/api/sessions");
    }

    it("6.2 вызывает /sessions и распаковывает .sessions без изменений", async () => {
        apiFetchMock.mockResolvedValue({ sessions: fixture });
        const sessions = await loadRealSummaries();

        const result = await sessions.fetchSessionSummaries();

        expect(result).toEqual(fixture);
        expect(Object.keys(result[0]).sort()).toEqual([
            "createdAt",
            "id",
            "mode",
            "tutorId",
            "updatedAt",
        ]);
        expect(apiFetchMock).toHaveBeenCalledWith("/sessions");
    });

    it("6.3 пустой конверт { sessions: [] } даёт пустой массив", async () => {
        apiFetchMock.mockResolvedValue({ sessions: [] });
        const sessions = await loadRealSummaries();

        await expect(sessions.fetchSessionSummaries()).resolves.toEqual([]);
    });

    it("6.4 пробрасывает 401, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const sessions = await loadRealSummaries();

        await expect(sessions.fetchSessionSummaries()).rejects.toThrow();
    });

    it("6.5 пробрасывает 500, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(500, "Internal server error"));
        const sessions = await loadRealSummaries();

        await expect(sessions.fetchSessionSummaries()).rejects.toThrow();
    });
});
