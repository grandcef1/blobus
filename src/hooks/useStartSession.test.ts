// ARCHITECT: старт сессии — развилка мок/реал с разной навигацией, поэтому проверяются обе ветки, отказ
// без выбранных данных и ошибка создания. Паттерн моков — как в src/hooks/useVocabulary.test.ts: api-слой
// мокается точечно, real-режим через vi.stubEnv + vi.resetModules + динамический import.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import type { SessionSummaryDto } from "@/api/sessions";

const {
    createSessionMock,
    createSessionSummaryMock,
    getResultMock,
    levelForModeMock,
    navigateMock,
    toastErrorMock,
    tMock,
    i18nMock,
} = vi.hoisted(() => ({
    createSessionMock: vi.fn(),
    createSessionSummaryMock: vi.fn(),
    getResultMock: vi.fn(),
    levelForModeMock: vi.fn(),
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    tMock: (key: string) => key,
    i18nMock: { language: "ru" },
}));

vi.mock("@/api/sessions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/sessions")>();
    return {
        ...actual,
        createSession: createSessionMock,
        createSessionSummary: createSessionSummaryMock,
    };
});

vi.mock("@/api/placement", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/placement")>();
    return { ...actual, getResult: getResultMock };
});

vi.mock("@/lib/placement", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/placement")>();
    return { ...actual, levelForMode: levelForModeMock };
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

const CREATED: SessionSummaryDto = {
    id: "a1b2c3d4-0004-4000-8000-000000000004",
    tutorId: "nova",
    mode: "grammar",
    createdAt: "2026-11-21T09:00:00.000Z",
    updatedAt: "2026-11-21T09:00:00.000Z",
};

let queryClient: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, children)
    );
}

// ARCHITECT: свежий реестр модулей на тест: USE_MOCKS читается при импорте хука.
async function loadHook(): Promise<{
    useStartSession: typeof import("@/hooks/useStartSession").useStartSession;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const hook = await import("@/hooks/useStartSession");

    return { useStartSession: hook.useStartSession, ApiError: client.ApiError };
}

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
});

afterEach(() => {
    createSessionMock.mockReset();
    createSessionSummaryMock.mockReset();
    getResultMock.mockReset();
    levelForModeMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    invalidateSpy.mockRestore();
});

describe("useStartSession", () => {
    it("4.1 мок-режим: createSession с targetLevel и переход в чат", async () => {
        createSessionMock.mockReturnValue({ id: "session-mock-9" });
        levelForModeMock.mockReturnValue("B1");
        getResultMock.mockReturnValue(null);
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("miya", "speaking");
        });

        expect(createSessionMock).toHaveBeenCalledWith({
            repetitorId: "miya",
            learningMode: "speaking",
            targetLevel: "B1",
        });
        expect(navigateMock).toHaveBeenCalledWith("/app/chat/session-mock-9", { replace: true });
        expect(createSessionSummaryMock).not.toHaveBeenCalled();
    });

    it("4.2 real-режим: сводка без targetLevel, инвалидация списка, переход в список", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        createSessionSummaryMock.mockResolvedValue(CREATED);
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        expect(createSessionSummaryMock).toHaveBeenCalledWith({ tutorId: "nova", mode: "grammar" });
        // ARCHITECT: ключ ["sessions"] общий со списком и сайдбаром — инвалидация обновляет оба.
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sessions"] });
        expect(navigateMock).toHaveBeenCalledWith("/app/sessions", { replace: true });
        expect(createSessionMock).not.toHaveBeenCalled();
    });

    it("4.3 real ошибка создания: тост и переход в список", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        createSessionSummaryMock.mockRejectedValue(new Error("boom"));
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        expect(toastErrorMock).toHaveBeenCalledWith("states.error.title");
        expect(navigateMock).toHaveBeenCalledWith("/app/sessions", { replace: true });
    });

    it("4.4 нет репетитора или режима: создание не вызывается, переход в список", async () => {
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession(null, "speaking");
        });
        await act(async () => {
            await result.current.startSession("miya", null);
        });

        expect(createSessionMock).not.toHaveBeenCalled();
        expect(createSessionSummaryMock).not.toHaveBeenCalled();
        expect(navigateMock).toHaveBeenCalledTimes(2);
        expect(navigateMock).toHaveBeenNthCalledWith(1, "/app/sessions", { replace: true });
        expect(navigateMock).toHaveBeenNthCalledWith(2, "/app/sessions", { replace: true });
    });

    it("4.5 real 401: переход в список, разбор expiry остаётся за useSessions", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useStartSession, ApiError } = await loadHook();
        createSessionSummaryMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        expect(navigateMock).toHaveBeenCalledWith("/app/sessions", { replace: true });
    });
});
