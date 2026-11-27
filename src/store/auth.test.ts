// ARCHITECT: экшен завершения онбординга трогает и сеть, и состояние: тест держит оба контракта — флаг
// ставится только после ответа сервера, а гость остаётся гостем (пустой патч, как markEmailVerified).
// ARCHITECT: фаза аутентификации проверяется отдельно: от неё зависит, показывать ли форму входа.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/api/auth";
import { selectAuthStatus, useAuthStore } from "@/store/auth";

const { completeOnboardingMock } = vi.hoisted(() => ({ completeOnboardingMock: vi.fn() }));

// ARCHITECT: мокается только completeOnboarding, остальные экспорты api/auth (включая USE_REAL_AUTH)
// остаются настоящими: store получает реальный мок-режим и не уходит в сеть.
vi.mock("@/api/auth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/auth")>();
    return { ...actual, completeOnboarding: completeOnboardingMock };
});

const INCOMPLETE: AuthUser = {
    id: "user_incomplete",
    name: "Ученик",
    email: "student@example.test",
    role: "user",
    emailVerified: true,
    onboardingCompleted: false,
};

beforeEach(() => {
    completeOnboardingMock.mockReset();
    useAuthStore.setState({ user: null });
    window.localStorage.clear();
});

describe("completeOnboarding", () => {
    it("после успеха ставит флаг, не меняя остальные поля", async () => {
        useAuthStore.setState({ user: { ...INCOMPLETE } });
        completeOnboardingMock.mockResolvedValue(undefined);

        await useAuthStore.getState().completeOnboarding();

        expect(useAuthStore.getState().user).toEqual({
            ...INCOMPLETE,
            onboardingCompleted: true,
        });
    });

    it("при отказе сервера флаг не ставится", async () => {
        useAuthStore.setState({ user: { ...INCOMPLETE } });
        completeOnboardingMock.mockRejectedValue(new Error("auth service unavailable"));

        await expect(useAuthStore.getState().completeOnboarding()).rejects.toThrow();
        expect(useAuthStore.getState().user?.onboardingCompleted).toBe(false);
    });

    it("гость остаётся гостем и не получает ошибку", async () => {
        completeOnboardingMock.mockResolvedValue(undefined);

        await expect(useAuthStore.getState().completeOnboarding()).resolves.toBeUndefined();
        expect(useAuthStore.getState().user).toBeNull();
    });

    it("повтор на завершённом профиле оставляет флаг", async () => {
        useAuthStore.setState({ user: { ...INCOMPLETE, onboardingCompleted: true } });
        completeOnboardingMock.mockResolvedValue(undefined);

        await useAuthStore.getState().completeOnboarding();

        expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true);
    });
});

describe("selectAuthStatus", () => {
    it("в фазе проверки возвращает resolving, даже когда пользователь уже поднят", () => {
        useAuthStore.setState({ user: { ...INCOMPLETE }, resolving: true });

        expect(selectAuthStatus(useAuthStore.getState())).toBe("resolving");
    });

    it("после проверки без пользователя — anonymous", () => {
        useAuthStore.setState({ user: null, resolving: false });

        expect(selectAuthStatus(useAuthStore.getState())).toBe("anonymous");
    });

    it("после проверки с пользователем — authenticated", () => {
        useAuthStore.setState({ user: { ...INCOMPLETE }, resolving: false });

        expect(selectAuthStatus(useAuthStore.getState())).toBe("authenticated");
    });

    it("вход снимает фазу проверки: статус не остаётся resolving", async () => {
        useAuthStore.setState({ resolving: true });

        await useAuthStore.getState().signIn("student@example.test", "Strong-Pass-1");

        expect(selectAuthStatus(useAuthStore.getState())).toBe("authenticated");
    });
});
