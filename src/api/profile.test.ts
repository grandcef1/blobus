// ARCHITECT: адаптер профиля — двойная реализация по образцу billing: мок-режим отдаёт локальный мок, а
// реальный режим идёт через apiFetch (cookie-сессия + CSRF + 401→refresh). Тесты проверяют обе ветки и
// проброс ошибок; фикстуры вымышленные, без PII реальных людей.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { MOCK_PROFILE, fetchProfile } from "@/api/profile";
import type { ProfileDto } from "@/api/profile";

// ARCHITECT: apiFetch мокается точечно, ApiError остаётся настоящим: real-режимные тесты проверяют проброс
// ошибок, не поднимая сеть.
const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

describe("мок-режим: fetchProfile отдаёт адаптерный мок", () => {
    it("резолвится в MOCK_PROFILE и не ходит в apiFetch", async () => {
        const profile = await fetchProfile();

        expect(profile).toEqual(MOCK_PROFILE);
        expect(profile.displayName).toBe(MOCK_PROFILE_USER.name);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });
});

describe("real-режим: fetchProfile читает DTO через apiFetch", () => {
    const fixture: ProfileDto = {
        displayName: "Ученик",
        locale: "en",
        dailyMinutes: 15,
        memberSince: "2026-10-01T08:00:00.000Z",
        onboardingCompleted: true,
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
    function loadRealProfile(): Promise<typeof import("@/api/profile")> {
        return import("@/api/profile");
    }

    it("переносит поля DTO как есть и ходит на /profile", async () => {
        apiFetchMock.mockResolvedValue({ profile: fixture });
        const profile = await loadRealProfile();

        const result = await profile.fetchProfile();

        expect(result).toEqual(fixture);
        // ARCHITECT: наружу уходит ровно контракт DTO: лишних полей адаптер не добавляет.
        expect(Object.keys(result).sort()).toEqual([
            "dailyMinutes",
            "displayName",
            "locale",
            "memberSince",
            "onboardingCompleted",
        ]);
        expect(apiFetchMock).toHaveBeenCalledWith("/profile");
    });

    it("пробрасывает ошибку 500, не глотая её", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(500, "HTTP 500"));
        const profile = await loadRealProfile();

        await expect(profile.fetchProfile()).rejects.toThrow();
    });

    it("пробрасывает 401: повтор 401→refresh — ответственность apiFetch", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(401, "HTTP 401"));
        const profile = await loadRealProfile();

        await expect(profile.fetchProfile()).rejects.toThrow();
    });
});
