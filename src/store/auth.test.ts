// ARCHITECT: экшен завершения онбординга трогает и сеть, и состояние: тест держит оба контракта — флаг
// ставится только после ответа сервера, а гость остаётся гостем (пустой патч, как markEmailVerified).

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/api/auth";
import { useAuthStore } from "@/store/auth";

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
