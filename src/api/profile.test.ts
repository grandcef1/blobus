// ARCHITECT: адаптер профиля — двойная реализация по образцу billing: мок-режим отдаёт локальный мок, а
// реальный режим идёт через apiFetch (cookie-сессия + CSRF + 401→refresh). Тесты проверяют обе ветки и
// проброс ошибок; фикстуры вымышленные, без PII реальных людей.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import {
    MOCK_PROFILE,
    deleteAvatar,
    fetchProfile,
    updateProfile,
    uploadAvatar,
} from "@/api/profile";
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
        avatarUrl: "http://127.0.0.1:54321/storage/v1/object/sign/avatars/u-1/a.png?token=test",
        providerAvatarUrl: "https://lh3.googleusercontent.com/a/test-avatar",
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
            "avatarUrl",
            "dailyMinutes",
            "displayName",
            "locale",
            "memberSince",
            "onboardingCompleted",
            "providerAvatarUrl",
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
describe("мок-режим: updateProfile правит MOCK_PROFILE", () => {
    it("5.1 обновляет мок и не ходит в apiFetch", async () => {
        const updated = await updateProfile({ displayName: "Алекс", dailyMinutes: 35 });

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(updated.displayName).toBe("Алекс");
        expect(updated.dailyMinutes).toBe(35);
        expect(MOCK_PROFILE.displayName).toBe("Алекс");
        expect(MOCK_PROFILE.dailyMinutes).toBe(35);
        // ARCHITECT: непереданные поля остаются как были — частичный патч не затирает локаль.
        expect(updated.locale).toBe("ru");
        expect(updated.memberSince).toBe(MOCK_PROFILE.memberSince);
    });
});

describe("real-режим: updateProfile пишет DTO через apiFetch", () => {
    const fixture: ProfileDto = {
        displayName: "Алекс",
        locale: "en",
        dailyMinutes: 35,
        memberSince: "2026-10-01T08:00:00.000Z",
        onboardingCompleted: true,
        // ARCHITECT: PATCH пока не отдаёт avatar-поля (B-8 меняет только GET); в фикстуре они нужны для типа.
        avatarUrl: null,
        providerAvatarUrl: null,
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

    it("5.2 PATCH /profile с телом-объектом и распаковка .profile", async () => {
        apiFetchMock.mockResolvedValue({ profile: fixture });
        const profile = await loadRealProfile();
        const input = { displayName: "Алекс", locale: "en" as const, dailyMinutes: 35 };

        const result = await profile.updateProfile(input);

        expect(result).toEqual(fixture);
        // ARCHITECT: тело уходит объектом — apiFetch сериализует сам; строка была бы JSON внутри JSON.
        expect(apiFetchMock).toHaveBeenCalledWith("/profile", { method: "PATCH", body: input });
    });

    it("5.3 пробрасывает 400, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(400, "Request could not be processed"));
        const profile = await loadRealProfile();

        await expect(profile.updateProfile({ dailyMinutes: 4 })).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it("5.4 пробрасывает 401, не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const profile = await loadRealProfile();

        await expect(profile.updateProfile({ dailyMinutes: 30 })).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("5.5 пробрасывает 403 (нет CSRF-пары), не глотая его", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock.mockRejectedValue(new ApiError(403, "Request forbidden"));
        const profile = await loadRealProfile();

        await expect(profile.updateProfile({ dailyMinutes: 30 })).rejects.toMatchObject({
            statusCode: 403,
        });
    });
});
describe("мок-режим: транспорт аватара", () => {
    it("5.1 uploadAvatar возвращает путь и не ходит в apiFetch; повтор даёт новый путь", async () => {
        const first = await uploadAvatar("data:image/png;base64,AAAA");
        const second = await uploadAvatar("data:image/png;base64,AAAA");

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(first.avatarPath.startsWith("mock/")).toBe(true);
        expect(first.avatarPath.endsWith(".png")).toBe(true);
        expect(second.avatarPath).not.toBe(first.avatarPath);
    });

    it("5.2 deleteAvatar возвращает { avatarPath: null } без apiFetch", async () => {
        const result = await deleteAvatar();

        expect(apiFetchMock).not.toHaveBeenCalled();
        expect(result).toEqual({ avatarPath: null });
    });
});

describe("real-режим: транспорт аватара", () => {
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

    it("5.3 uploadAvatar: POST /profile/avatar с телом-объектом и распаковка .avatarPath", async () => {
        const image = "data:image/png;base64,AAAA";
        apiFetchMock.mockResolvedValue({ avatarPath: "user-id/key.png" });
        const profile = await loadRealProfile();

        const result = await profile.uploadAvatar(image);

        expect(result).toEqual({ avatarPath: "user-id/key.png" });
        // ARCHITECT: тело уходит объектом — apiFetch сериализует сам; строка была бы JSON внутри JSON.
        expect(apiFetchMock).toHaveBeenCalledWith("/profile/avatar", {
            method: "POST",
            body: { image },
        });
    });

    it("5.4 deleteAvatar: DELETE /profile/avatar и { avatarPath: null }", async () => {
        apiFetchMock.mockResolvedValue({ avatarPath: null });
        const profile = await loadRealProfile();

        const result = await profile.deleteAvatar();

        expect(result).toEqual({ avatarPath: null });
        expect(apiFetchMock).toHaveBeenCalledWith("/profile/avatar", { method: "DELETE" });
    });

    it("5.5 пробрасывает 400, 401 и 403, не глотая их", async () => {
        const { ApiError } = await import("@/api/client");
        apiFetchMock
            .mockRejectedValueOnce(new ApiError(400, "Request could not be processed"))
            .mockRejectedValueOnce(new ApiError(401, "Unauthorized"))
            .mockRejectedValueOnce(new ApiError(403, "Request forbidden"));
        const profile = await loadRealProfile();

        await expect(profile.uploadAvatar("data:image/png;base64,AAAA")).rejects.toMatchObject({
            statusCode: 400,
        });
        await expect(profile.deleteAvatar()).rejects.toMatchObject({ statusCode: 401 });
        await expect(profile.deleteAvatar()).rejects.toMatchObject({ statusCode: 403 });
    });
});
describe("мок-режим: аватар в DTO профиля", () => {
    it("5.6 fetchProfile без загрузки: avatarUrl и providerAvatarUrl равны null", async () => {
        const profile = await fetchProfile();

        expect(profile.avatarUrl).toBeNull();
        expect(profile.providerAvatarUrl).toBeNull();
    });

    it("5.7 upload -> fetchProfile: avatarUrl равен переданному data URL", async () => {
        const image = "data:image/png;base64,BBBB";

        await uploadAvatar(image);
        const profile = await fetchProfile();

        expect(profile.avatarUrl).toBe(image);
        expect(profile.providerAvatarUrl).toBeNull();
    });

    it("5.8 delete -> fetchProfile: avatarUrl снова null", async () => {
        await uploadAvatar("data:image/png;base64,BBBB");
        await deleteAvatar();

        const profile = await fetchProfile();

        expect(profile.avatarUrl).toBeNull();
    });
});

describe("real-режим: avatar-поля в ответе профиля", () => {
    const fixture: ProfileDto = {
        displayName: "Ученик",
        locale: "ru",
        dailyMinutes: 20,
        memberSince: "2026-10-01T08:00:00.000Z",
        onboardingCompleted: true,
        avatarUrl: "http://127.0.0.1:54321/storage/v1/object/sign/avatars/u-1/a.png?token=test",
        providerAvatarUrl: "https://lh3.googleusercontent.com/a/test-avatar",
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

    it("5.9 fetchProfile переносит avatarUrl и providerAvatarUrl без изменений", async () => {
        apiFetchMock.mockResolvedValue({ profile: fixture });
        const profile = await import("@/api/profile");

        const result = await profile.fetchProfile();

        expect(result.avatarUrl).toBe(fixture.avatarUrl);
        expect(result.providerAvatarUrl).toBe(fixture.providerAvatarUrl);
        expect(apiFetchMock).toHaveBeenCalledWith("/profile");
    });
});
