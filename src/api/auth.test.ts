// ARCHITECT: Google-вход ломался на проде из-за одной опции: при persistSession:false auth-js держит PKCE
// code-verifier в хранилище памяти страницы (memoryLocalStorageAdapter), а страница уходит к провайдеру —
// verifier теряется, exchangeCodeForSession на /login?code=... не находит его, и серверная сессия не
// создаётся. Тест сторожит ровно этот флаг: BROWSER_AUTH_OPTIONS читается как данные — без моков
// supabase-js и без подмены import.meta.env.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    BROWSER_AUTH_OPTIONS,
    completeOnboarding,
    signIn,
    signInWithGoogle,
    signUp,
} from "@/api/auth";

// ARCHITECT: apiFetch мокается точечно, ApiError остаётся настоящим: real-режимные тесты проверяют и
// повторы, и маппинг DTO, не поднимая сеть. Фикстуры вымышленные.
const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

describe("настройки браузерного supabase-клиента", () => {
    it("хранит сессию, чтобы code-verifier пережил редирект к провайдеру", () => {
        expect(BROWSER_AUTH_OPTIONS.persistSession).toBe(true);
    });

    it("не возвращается к потере verifier: persistSession не false", () => {
        expect(BROWSER_AUTH_OPTIONS.persistSession).not.toBe(false);
    });

    it("остаётся на PKCE-танце", () => {
        expect(BROWSER_AUTH_OPTIONS.flowType).toBe("pkce");
    });

    it("не подхватывает сессию из адреса", () => {
        expect(BROWSER_AUTH_OPTIONS.detectSessionInUrl).toBe(false);
    });

    it("не обновляет токен в фоне: источник правды — серверная кука", () => {
        expect(BROWSER_AUTH_OPTIONS.autoRefreshToken).toBe(false);
    });
});

describe("мок-режим: флаг онбординга в пользователе", () => {
    it("регистрация помечает онбординг непройденным", async () => {
        const user = await signUp("Ученик", "student@example.test", "Strong-Pass-1");

        expect(user.onboardingCompleted).toBe(false);
    });

    it("вход в существующий аккаунт считается завершённым", async () => {
        const user = await signIn("student@example.test", "Strong-Pass-1");

        expect(user.onboardingCompleted).toBe(true);
    });

    it("Google-вход в моке считается завершённым", async () => {
        const user = await signInWithGoogle();

        expect(user.onboardingCompleted).toBe(true);
    });

    it("completeOnboarding в моке резолвится без выброса", async () => {
        await expect(completeOnboarding()).resolves.toBeUndefined();
    });
});

describe("real-режим: маппинг DTO и завершение онбординга", () => {
    // ARCHITECT: модули перезагружаются под настоящий VITE_AUTH_MODE=real; apiFetch записывает пути, а
    // служебный /auth/me гидратации стора отфильтровывается в ассертах.
    const calls: string[] = [];
    let respond: (path: string) => Promise<unknown> = () => Promise.resolve({ status: "ok" });

    beforeEach(() => {
        calls.length = 0;
        respond = () => Promise.resolve({ status: "ok" });
        vi.stubEnv("VITE_AUTH_MODE", "real");
        vi.resetModules();
    });

    afterEach(() => {
        apiFetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.resetModules();
        vi.restoreAllMocks();
    });

    async function loadRealAuth(): Promise<{
        auth: typeof import("@/api/auth");
        ApiError: typeof import("@/api/client").ApiError;
    }> {
        const client = await import("@/api/client");
        const auth = await import("@/api/auth");

        apiFetchMock.mockImplementation((path: string) => {
            calls.push(path);
            return respond(path);
        });

        return { auth, ApiError: client.ApiError };
    }

    /** Пути завершения и refresh без служебного /auth/me гидратации стора. */
    function completionCalls(): readonly string[] {
        return calls.filter(
            (path) => path === "/auth/onboarding-complete" || path === "/auth/refresh"
        );
    }

    it("legacy-ответ без поля означает завершённый онбординг", async () => {
        const { auth } = await loadRealAuth();
        respond = () => Promise.resolve({ user: { id: "user_1", email: "student@example.test" } });

        const user = await auth.fetchCurrentUser();

        expect(user?.onboardingCompleted).toBe(true);
    });

    it("onboardingCompleted false переносится как false", async () => {
        const { auth } = await loadRealAuth();
        respond = () =>
            Promise.resolve({
                user: { id: "user_1", email: "student@example.test", onboardingCompleted: false },
            });

        const user = await auth.fetchCurrentUser();

        expect(user?.onboardingCompleted).toBe(false);
    });

    it("onboardingCompleted true переносится как true", async () => {
        const { auth } = await loadRealAuth();
        respond = () =>
            Promise.resolve({
                user: { id: "user_1", email: "student@example.test", onboardingCompleted: true },
            });

        const user = await auth.fetchCurrentUser();

        expect(user?.onboardingCompleted).toBe(true);
    });

    it("при 401 завершение обновляет токен и повторяет запрос", async () => {
        const { auth, ApiError } = await loadRealAuth();
        let attempts = 0;
        respond = (path) => {
            if (path !== "/auth/onboarding-complete") return Promise.resolve({ status: "ok" });

            attempts += 1;

            return attempts === 1
                ? Promise.reject(new ApiError(401, "HTTP 401"))
                : Promise.resolve({ status: "ok" });
        };

        await auth.completeOnboarding();

        expect(completionCalls()).toEqual([
            "/auth/onboarding-complete",
            "/auth/refresh",
            "/auth/onboarding-complete",
        ]);
    });

    it("при не-401 сбое завершение падает и не обновляет токен", async () => {
        const { auth, ApiError } = await loadRealAuth();
        respond = () => Promise.reject(new ApiError(500, "HTTP 500"));

        await expect(auth.completeOnboarding()).rejects.toThrow();

        expect(completionCalls()).toEqual(["/auth/onboarding-complete"]);
    });
});
