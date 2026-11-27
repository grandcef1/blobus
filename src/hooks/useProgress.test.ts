// ARCHITECT: useProgress — граница мок/реал для сводки прогресса: проверяются обе ветки, политика повторов и
// общий гард 401. Паттерн моков — как в useVocabulary.test.ts: api-слой мокается точечно, real-режим через
// vi.stubEnv + vi.resetModules + динамический import.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import type { ProgressDto } from "@/api/progress";

const { fetchProgressDtoMock, navigateMock, toastErrorMock, tMock, i18nMock } = vi.hoisted(() => ({
    fetchProgressDtoMock: vi.fn(),
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    tMock: (key: string) => key,
    i18nMock: { language: "ru" },
}));

vi.mock("@/api/progress", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/progress")>();
    return { ...actual, fetchProgressDto: fetchProgressDtoMock };
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

const PROGRESS: ProgressDto = {
    level: "B1",
    score: 58,
    sessionsTotal: 2,
    messagesTotal: 12,
    wordsTotal: 7,
    wordsDueToday: 3,
    streakDays: 4,
    weeklyActivity: [{ date: "2026-11-24", messages: 4 }],
    recentSessions: [
        {
            id: "8f1c2e5a-1c3b-4d2e-9a7f-2b6c4d8e0a11",
            title: null,
            tutorId: "miya",
            mode: "speaking",
            createdAt: "2026-11-24T09:00:00.000Z",
            updatedAt: "2026-11-24T09:30:00.000Z",
        },
    ],
};

const USER = {
    id: "2f1c2e5a-1c3b-4d2e-9a7f-2b6c4d8e0a99",
    name: "Ученик",
    email: "student@example.test",
    role: "user" as const,
    emailVerified: true,
};

let queryClient: QueryClient;

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, children)
    );
}

async function loadHook(): Promise<{
    useProgress: typeof import("@/hooks/useProgress").useProgress;
    useAuthStore: typeof import("@/store/auth").useAuthStore;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const auth = await import("@/store/auth");
    const hook = await import("@/hooks/useProgress");

    return {
        useProgress: hook.useProgress,
        useAuthStore: auth.useAuthStore,
        ApiError: client.ApiError,
    };
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
    fetchProgressDtoMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useProgress", () => {
    it("30.1 мок-ветка: фикстура DTO уезжает в экраны целиком", async () => {
        fetchProgressDtoMock.mockResolvedValue(PROGRESS);
        const { useProgress } = await loadHook();
        const { result } = renderHook(() => useProgress(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.progress).toEqual(PROGRESS);
        expect(fetchProgressDtoMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("30.2 real-ветка: без пользователя запрос не уходит, после входа — уходит", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        fetchProgressDtoMock.mockResolvedValue(PROGRESS);
        const { useProgress, useAuthStore } = await loadHook();
        const { result } = renderHook(() => useProgress(), { wrapper: Wrapper });

        await act(async () => {
            await Promise.resolve();
        });

        expect(fetchProgressDtoMock).not.toHaveBeenCalled();
        expect(result.current.progress).toBeNull();

        act(() => {
            useAuthStore.setState({ user: { ...USER } });
        });

        await waitFor(() => expect(result.current.progress).toEqual(PROGRESS));
    });

    it("30.3 real 429: без авто-повтора и с тостом ошибки", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProgress, useAuthStore, ApiError } = await loadHook();
        fetchProgressDtoMock.mockRejectedValue(new ApiError(429, "RATE_LIMITED"));
        useAuthStore.setState({ user: { ...USER } });
        const { result } = renderHook(() => useProgress(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(fetchProgressDtoMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).toHaveBeenCalledWith("states.error.title");
    });

    it("30.4 real 401: терминальный тост и уход на /login даёт общий useAuthExpiry", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProgress, useAuthStore, ApiError } = await loadHook();
        fetchProgressDtoMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED"));
        useAuthStore.setState({ user: { ...USER } });
        renderHook(() => useProgress(), { wrapper: Wrapper });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        // ARCHITECT: тост один: терминальный 401 не дублируется сообщением о неудачной загрузке.
        expect(toastErrorMock).toHaveBeenCalledWith("errors.sessionExpired");
        expect(toastErrorMock).not.toHaveBeenCalledWith("states.error.title");
        expect(useAuthStore.getState().user).toBeNull();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });
});
