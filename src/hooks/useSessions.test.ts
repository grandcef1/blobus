// ARCHITECT: хук сессий — граница мок/реал, поэтому проверяются обе ветки, политика повторов и локальная
// реакция на 401. Паттерн моков — как в src/hooks/useProfile.test.ts: api-слой мокается точечно,
// real-режим через vi.stubEnv + vi.resetModules + динамический import, а resetModules заодно сбрасывает
// модульный гард 401 между тестами, не трогая React и QueryClient.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import type { SessionSummaryDto } from "@/api/sessions";
import type { EnhancedChatSession } from "@/types/session";

const {
    fetchSessionsMock,
    fetchSessionSummariesMock,
    navigateMock,
    toastErrorMock,
    tMock,
    i18nMock,
} = vi.hoisted(() => ({
    fetchSessionsMock: vi.fn(),
    fetchSessionSummariesMock: vi.fn(),
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    tMock: (key: string) => key,
    i18nMock: { language: "ru" },
}));

vi.mock("@/api/sessions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/sessions")>();
    return {
        ...actual,
        fetchSessions: fetchSessionsMock,
        fetchSessionSummaries: fetchSessionSummariesMock,
    };
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

const MOCK_SESSION: EnhancedChatSession = {
    id: "session-mock-1",
    userId: "user_1",
    title: "Практика разговора",
    createdAt: Date.parse("2026-11-18T09:00:00.000Z"),
    messages: [],
    repetitorId: "miya",
    learningMode: "speaking",
    progress: { completedLessons: 3, totalLessons: 10, wordsLearned: 28, streakDays: 7 },
    lastActivityAt: Date.parse("2026-11-18T09:30:00.000Z"),
};

const SUMMARIES: SessionSummaryDto[] = [
    {
        id: "a1b2c3d4-0001-4000-8000-000000000001",
        title: null,
        tutorId: "miya",
        mode: "speaking",
        createdAt: "2026-11-18T09:00:00.000Z",
        updatedAt: "2026-11-18T09:30:00.000Z",
    },
];

const USER = {
    id: "u-1",
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

// ARCHITECT: свежий реестр модулей на тест: USE_MOCKS читается при импорте, а модульный гард 401
// должен начинать эпизод с чистого состояния.
async function loadHook(): Promise<{
    useSessions: typeof import("@/hooks/useSessions").useSessions;
    useAuthStore: typeof import("@/store/auth").useAuthStore;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const auth = await import("@/store/auth");
    const hook = await import("@/hooks/useSessions");

    return {
        useSessions: hook.useSessions,
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

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});

afterEach(() => {
    fetchSessionsMock.mockReset();
    fetchSessionSummariesMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useSessions", () => {
    it("5.1 мок-режим: kind=mock из fetchSessions, real-источник не вызывается", async () => {
        fetchSessionsMock.mockResolvedValue([MOCK_SESSION]);
        const { useSessions } = await loadHook();

        const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.sessions).toHaveLength(1));

        expect(result.current.kind).toBe("mock");
        expect(result.current.sessions[0]).toEqual(MOCK_SESSION);
        expect(fetchSessionSummariesMock).not.toHaveBeenCalled();
    });

    it("5.2 real-режим: kind=real, сводки доезжают, мок-источник не вызывается", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        fetchSessionSummariesMock.mockResolvedValue(SUMMARIES);
        const { useSessions, useAuthStore } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });

        const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.sessions).toHaveLength(1));

        expect(result.current.kind).toBe("real");
        expect(result.current.sessions[0]).toEqual(SUMMARIES[0]);
        expect(fetchSessionSummariesMock).toHaveBeenCalledTimes(1);
        expect(fetchSessionsMock).not.toHaveBeenCalled();
    });

    it("5.3 real 401: тост один раз, сессия очищена, навигация ровно через 3000 мс", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useSessions, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchSessionSummariesMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        renderHook(() => useSessions(), { wrapper: Wrapper });

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

    it("5.4 real 401 повторно: гард держит один тост и одну навигацию", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useSessions, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchSessionSummariesMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

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

    it("5.5 real 429: без авто-повтора, ошибка отдаётся наружу", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useSessions, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchSessionSummariesMock.mockRejectedValue(new ApiError(429, "Too many requests"));

        const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.kind).toBe("real");
        expect(fetchSessionSummariesMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).toHaveBeenCalledWith("states.error.title");
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("5.6 real смена userId: новый ключ даёт новый запрос, старые данные не переиспользуются", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useSessions, useAuthStore } = await loadHook();
        const second: SessionSummaryDto = {
            ...SUMMARIES[0],
            id: "a1b2c3d4-0002-4000-8000-000000000002",
            title: null,
            tutorId: "nova",
        };
        fetchSessionSummariesMock.mockResolvedValueOnce(SUMMARIES).mockResolvedValueOnce([second]);
        useAuthStore.setState({ user: { ...USER } });

        const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.sessions[0]).toEqual(SUMMARIES[0]));

        await act(async () => {
            useAuthStore.setState({ user: { ...USER, id: "u-2" } });
        });

        await waitFor(() => expect(fetchSessionSummariesMock).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(result.current.sessions[0]).toEqual(second));
    });
});
