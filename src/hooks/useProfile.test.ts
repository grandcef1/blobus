// ARCHITECT: хук профиля — точка входа идентичности, поэтому проверяются обе ветки (мок/реал), авто-повтор
// 404, терминальный 401 (тост + редирект через 3 с) и изоляция кэша по userId. Паттерн моков — как в
// src/api/profile.test.ts: apiFetch точечно, real-режим через vi.stubEnv + vi.resetModules + динамический
// import. resetModules сбрасывает модульный гард хука между тестами, не задевая React/QueryClient.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { MOCK_PROFILE } from "@/api/profile";
import type { ProfileDto } from "@/api/profile";

const { apiFetchMock, navigateMock, toastErrorMock, tMock, i18nMock } = vi.hoisted(() => ({
    apiFetchMock: vi.fn(),
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    tMock: (key: string) => key,
    i18nMock: { language: "ru" },
}));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock };
});

vi.mock("@/store/toast", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/store/toast")>();
    return { ...actual, toast: { ...actual.toast, error: toastErrorMock } };
});

vi.mock("react-router-dom", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router-dom")>();
    return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("react-i18next", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-i18next")>();
    return { ...actual, useTranslation: () => ({ t: tMock, i18n: i18nMock }) };
});

const FIXTURE: ProfileDto = {
    displayName: "Ученик",
    locale: "en",
    dailyMinutes: 15,
    memberSince: "2026-10-01T08:00:00.000Z",
    onboardingCompleted: true,
};

let queryClient: QueryClient;

// ARCHITECT: файл .ts (без JSX), поэтому обёртка собирается через createElement: свежий QueryClient на тест
// и MemoryRouter — как в renderWithProviders.
function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, children)
    );
}

// ARCHITECT: модуль хука и стор перезагружаются под актуальный VITE_USE_MOCKS: так real-ветка берёт
// свежий fetchProfile, а модульный гард 401 начинается с чистого состояния в каждом тесте.
async function loadHook(): Promise<{
    useProfile: typeof import("@/hooks/useProfile").useProfile;
    useAuthStore: typeof import("@/store/auth").useAuthStore;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const auth = await import("@/store/auth");
    const hook = await import("@/hooks/useProfile");

    return {
        useProfile: hook.useProfile,
        useAuthStore: auth.useAuthStore,
        ApiError: client.ApiError,
    };
}

// ARCHITECT: с fake-таймерами waitFor не годится — продвигаем таймеры вручную внутри act.
async function flush(ms: number): Promise<void> {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

const USER = {
    id: "u-1",
    name: "Ученик",
    email: "student@example.test",
    role: "user" as const,
    emailVerified: true,
};

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
    apiFetchMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useProfile", () => {
    it("5.1 мок-режим: отдаёт MOCK_PROFILE и не ходит в apiFetch", async () => {
        const { useProfile } = await loadHook();
        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.profile).toBeDefined(), { timeout: 2000 });

        expect(result.current.profile).toEqual(MOCK_PROFILE);
        expect(apiFetchMock).not.toHaveBeenCalled();
    });

    it("5.2 real-режим: DTO доезжает, apiFetch вызван один раз", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile } = await loadHook();
        apiFetchMock.mockResolvedValue({ profile: FIXTURE });

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.profile).toEqual(FIXTURE));

        expect(apiFetchMock).toHaveBeenCalledTimes(1);
        expect(apiFetchMock).toHaveBeenCalledWith("/profile");
        expect(result.current.memberSinceLabel).toContain("2026");
        expect(result.current.memberSinceLabel).not.toBe("");
    });

    it("5.3 404 дважды, затем успех: ровно 3 вызова, данные возвращаются", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, ApiError } = await loadHook();
        apiFetchMock
            .mockRejectedValueOnce(new ApiError(404, "Resource not found"))
            .mockRejectedValueOnce(new ApiError(404, "Resource not found"))
            .mockResolvedValueOnce({ profile: FIXTURE });

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await flush(2000);

        expect(apiFetchMock).toHaveBeenCalledTimes(3);
        expect(result.current.profile).toEqual(FIXTURE);
    });

    it("5.4 404 постоянный: после 3 вызовов isError, больше повторов нет", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, ApiError } = await loadHook();
        apiFetchMock.mockRejectedValue(new ApiError(404, "Resource not found"));

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await flush(5000);

        expect(apiFetchMock).toHaveBeenCalledTimes(3);
        expect(result.current.isError).toBe(true);

        await flush(5000);

        expect(apiFetchMock).toHaveBeenCalledTimes(3);
    });

    it("5.5 429: ровно один вызов, isError, без авто-повтора, тост прочей ошибки", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, ApiError } = await loadHook();
        apiFetchMock.mockRejectedValue(new ApiError(429, "Too many requests"));

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(apiFetchMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).toHaveBeenCalledWith("states.error.title");
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("5.6 401: тост один раз, сессия очищена, редирект на /login через 3 с", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        renderHook(() => useProfile(), { wrapper: Wrapper });

        await flush(0);

        expect(toastErrorMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).toHaveBeenCalledWith("errors.sessionExpired");
        expect(useAuthStore.getState().user).toBeNull();

        await flush(2999);
        expect(navigateMock).not.toHaveBeenCalled();

        await flush(1);
        expect(navigateMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });

    it("5.7 401 повторно: тост и навигация всё равно по одному разу", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await flush(0);
        expect(toastErrorMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.refetch();
        });
        await flush(0);

        expect(toastErrorMock).toHaveBeenCalledTimes(1);

        await flush(3000);

        expect(navigateMock).toHaveBeenCalledTimes(1);
    });

    it("5.8 refetch после ошибки: повторный вызов, данные возвращаются", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, ApiError } = await loadHook();
        apiFetchMock.mockRejectedValueOnce(new ApiError(500, "Internal server error"));

        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        apiFetchMock.mockResolvedValueOnce({ profile: FIXTURE });

        await act(async () => {
            await result.current.refetch();
        });

        expect(apiFetchMock).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(result.current.profile).toEqual(FIXTURE));
    });

    it("5.9 изоляция кэша: смена user.id заново читает профиль", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, useAuthStore } = await loadHook();
        const other: ProfileDto = { ...FIXTURE, displayName: "Другой" };
        apiFetchMock
            .mockResolvedValueOnce({ profile: FIXTURE })
            .mockResolvedValueOnce({ profile: other });

        useAuthStore.setState({ user: { ...USER } });
        const { result } = renderHook(() => useProfile(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.profile).toEqual(FIXTURE));

        await act(async () => {
            useAuthStore.setState({ user: { ...USER, id: "u-2" } });
        });

        await waitFor(() => expect(result.current.profile).toEqual(other));

        expect(apiFetchMock).toHaveBeenCalledTimes(2);
    });
});
