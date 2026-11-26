// ARCHITECT: интеграционный тест старта сессии — сквозной сценарий мастера на моках транспорта:
// проверяются вызовы createSession/createSessionSummary, инвалидация списка и фактическая навигация.
// useSessions здесь намеренно не мокается: хук старта его не использует, а обработку 401 в списке
// покрывает собственный тест useSessions.

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
    fetchPlacementResultDtoMock,
    levelForModeMock,
    navigateMock,
    toastErrorMock,
    tMock,
    i18nMock,
} = vi.hoisted(() => ({
    createSessionMock: vi.fn(),
    createSessionSummaryMock: vi.fn(),
    getResultMock: vi.fn(),
    fetchPlacementResultDtoMock: vi.fn(),
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
    return {
        ...actual,
        getResult: getResultMock,
        fetchPlacementResultDto: fetchPlacementResultDtoMock,
    };
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
    id: "a1b2c3d4-0006-4000-8000-000000000006",
    tutorId: "nova",
    mode: "grammar",
    createdAt: "2026-11-23T09:00:00.000Z",
    updatedAt: "2026-11-23T09:00:00.000Z",
};

// ARCHITECT: результат теста уровня — входной гейт real-ветки: без него сессия не создаётся, поэтому все
// real-сценарии стартуют с пройденным тестом.
const PLACEMENT = { level: "B1", score: 58, createdAt: "2026-11-22T09:00:00.000Z" } as const;

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
    fetchPlacementResultDtoMock.mockResolvedValue(PLACEMENT);
});

afterEach(() => {
    createSessionMock.mockReset();
    createSessionSummaryMock.mockReset();
    getResultMock.mockReset();
    fetchPlacementResultDtoMock.mockReset();
    levelForModeMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    invalidateSpy.mockRestore();
});
describe("useStartSession: сквозной сценарий", () => {
    it("5.1 mock-ветка: createSession с targetLevel и переход в чат", async () => {
        createSessionMock.mockReturnValue({ id: "session-mock-7" });
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
        expect(navigateMock).toHaveBeenCalledWith("/app/chat/session-mock-7", { replace: true });
        expect(createSessionSummaryMock).not.toHaveBeenCalled();
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("5.2 real-ветка успех: сводка без targetLevel, инвалидация и переход в чат", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        createSessionSummaryMock.mockResolvedValue(CREATED);
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        // ARCHITECT: targetLevel в реальной схеме нет — в теле только tutorId и mode.
        expect(createSessionSummaryMock).toHaveBeenCalledWith({ tutorId: "nova", mode: "grammar" });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sessions"] });
        expect(navigateMock).toHaveBeenCalledWith(`/app/chat/${CREATED.id}`, { replace: true });
        expect(createSessionMock).not.toHaveBeenCalled();
    });

    it("5.3 real-ветка ошибка 500: тост sessions.create.error и переход в список", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useStartSession, ApiError } = await loadHook();
        createSessionSummaryMock.mockRejectedValue(new ApiError(500, "Internal"));
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        expect(toastErrorMock).toHaveBeenCalledWith("sessions.create.error");
        expect(navigateMock).toHaveBeenCalledWith("/app/sessions", { replace: true });
        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("5.4 real-ветка 401: своего тоста нет, переход в список", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useStartSession, ApiError } = await loadHook();
        createSessionSummaryMock.mockRejectedValue(new ApiError(401, "Unauthorized"));
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            await result.current.startSession("nova", "grammar");
        });

        // ARCHITECT: терминальный тост и редирект делает useAuthExpiry через useSessions.
        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(navigateMock).toHaveBeenCalledWith("/app/sessions", { replace: true });
    });

    it("5.5 in-flight: повторный вызов до разрешения промиса игнорируется", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        let resolveCreate: (value: SessionSummaryDto) => void = () => undefined;
        createSessionSummaryMock.mockReturnValue(
            new Promise<SessionSummaryDto>((resolve) => {
                resolveCreate = resolve;
            })
        );
        const { useStartSession } = await loadHook();
        const { result } = renderHook(() => useStartSession(), { wrapper: Wrapper });

        await act(async () => {
            void result.current.startSession("nova", "grammar");
            void result.current.startSession("nova", "grammar");
        });

        expect(createSessionSummaryMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).not.toHaveBeenCalled();

        await act(async () => {
            resolveCreate(CREATED);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(navigateMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith(`/app/chat/${CREATED.id}`, { replace: true });
    });

    it("5.6 неполные данные: создание не вызывается, переход в список без тоста", async () => {
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
        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(navigateMock).toHaveBeenCalledTimes(2);
        expect(navigateMock).toHaveBeenNthCalledWith(1, "/app/sessions", { replace: true });
        expect(navigateMock).toHaveBeenNthCalledWith(2, "/app/sessions", { replace: true });
    });
});
