// ARCHITECT: общий обработчик истёкшей сессии — это про дедуп: на одной странице живут несколько
// read-хуков, и реакция обязана быть одна. Тесты держат и кросс-хуковый случай (профиль + сессии), и
// изоляцию эпизодов, и отмену уже запланированного редиректа при размонтировании.
// Паттерн моков — как в useProfile.test.ts: api-слой мокается точечно, реестр модулей сбрасывается
// между тестами, поэтому общий гард начинает эпизод с чистого состояния.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

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

// ARCHITECT: свежий реестр модулей на тест: общий гард живёт в модуле, поэтому эпизод должен начинаться
// с чистого состояния, а USE_MOCKS — читаться заново.
async function loadUnits(): Promise<{
    useAuthExpiry: typeof import("@/hooks/useAuthExpiry").useAuthExpiry;
    useProfile: typeof import("@/hooks/useProfile").useProfile;
    useSessions: typeof import("@/hooks/useSessions").useSessions;
    useAuthStore: typeof import("@/store/auth").useAuthStore;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const auth = await import("@/store/auth");
    const expiry = await import("@/hooks/useAuthExpiry");
    const profile = await import("@/hooks/useProfile");
    const sessions = await import("@/hooks/useSessions");

    return {
        useAuthExpiry: expiry.useAuthExpiry,
        useProfile: profile.useProfile,
        useSessions: sessions.useSessions,
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
    apiFetchMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useAuthExpiry", () => {
    it("5.1 кросс-хуковый дедуп: один тост и один редирект на useProfile и useSessions", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useProfile, useSessions, useAuthStore, ApiError } = await loadUnits();
        useAuthStore.setState({ user: { ...USER } });
        apiFetchMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        renderHook(() => ({ profile: useProfile(), sessions: useSessions() }), {
            wrapper: Wrapper,
        });

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

    it("5.2 не-401: тост истёкшей сессии и навигация не вызываются", async () => {
        vi.useFakeTimers();
        const { useAuthExpiry, ApiError } = await loadUnits();

        renderHook(() => useAuthExpiry(new ApiError(500, "Internal server error"), false), {
            wrapper: Wrapper,
        });

        await flush(3000);

        expect(toastErrorMock).not.toHaveBeenCalled();
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("5.3 сброс при успехе: 401, успех, 401 даёт два тоста", async () => {
        vi.useFakeTimers();
        const { useAuthExpiry, ApiError } = await loadUnits();
        const unauthorized = new ApiError(401, "Unauthorized");

        const { rerender } = renderHook(
            ({ error, isSuccess }: { error: unknown; isSuccess: boolean }) =>
                useAuthExpiry(error, isSuccess),
            { wrapper: Wrapper, initialProps: { error: unauthorized as unknown, isSuccess: false } }
        );

        await flush(0);
        expect(toastErrorMock).toHaveBeenCalledTimes(1);

        rerender({ error: null, isSuccess: true });
        await flush(0);

        rerender({ error: unauthorized, isSuccess: false });
        await flush(0);

        expect(toastErrorMock).toHaveBeenCalledTimes(2);
    });

    it("5.4 изоляция при размонтировании: новый рендер снова даёт один тост", async () => {
        vi.useFakeTimers();
        const { useAuthExpiry, ApiError } = await loadUnits();
        const unauthorized = new ApiError(401, "Unauthorized");

        const first = renderHook(() => useAuthExpiry(unauthorized, false), { wrapper: Wrapper });

        await flush(0);
        expect(toastErrorMock).toHaveBeenCalledTimes(1);

        first.unmount();

        renderHook(() => useAuthExpiry(unauthorized, false), { wrapper: Wrapper });
        await flush(0);

        expect(toastErrorMock).toHaveBeenCalledTimes(2);
    });

    it("5.5 таймер снимается при размонтировании: навигации нет", async () => {
        vi.useFakeTimers();
        const { useAuthExpiry, ApiError } = await loadUnits();

        const { unmount } = renderHook(
            () => useAuthExpiry(new ApiError(401, "Unauthorized"), false),
            { wrapper: Wrapper }
        );

        await flush(0);
        expect(toastErrorMock).toHaveBeenCalledTimes(1);

        unmount();
        await flush(3000);

        expect(navigateMock).not.toHaveBeenCalled();
    });
});
