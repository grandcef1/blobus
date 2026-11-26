// ARCHITECT: хук словаря — граница мок/реал, поэтому проверяются обе ветки, политика повторов и общая
// реакция на 401 из useAuthExpiry. Паттерн моков — как в src/hooks/useSessions.test.ts: api-слой мокается
// точечно, real-режим через vi.stubEnv + vi.resetModules + динамический import, а resetModules заодно
// сбрасывает модульный гард 401 между тестами, не трогая React и QueryClient.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import type { VocabularyEntryDto } from "@/api/progress";
import type { VocabularyWord } from "@/types/progress";

const {
    fetchVocabularyMock,
    fetchVocabularyEntriesMock,
    navigateMock,
    toastErrorMock,
    tMock,
    i18nMock,
} = vi.hoisted(() => ({
    fetchVocabularyMock: vi.fn(),
    fetchVocabularyEntriesMock: vi.fn(),
    navigateMock: vi.fn(),
    toastErrorMock: vi.fn(),
    tMock: (key: string) => key,
    i18nMock: { language: "ru" },
}));

vi.mock("@/api/progress", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/progress")>();
    return {
        ...actual,
        fetchVocabulary: fetchVocabularyMock,
        fetchVocabularyEntries: fetchVocabularyEntriesMock,
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

const MOCK_WORD: VocabularyWord = {
    id: "word_1",
    word: "collaborate",
    translation: "сотрудничать",
    pronunciation: "/kəˈlæbəreɪt/",
    partOfSpeech: "verb",
    examples: [{ sentence: "We need to collaborate on this project." }],
    learnedAt: Date.parse("2026-11-18T09:00:00.000Z"),
    lastReviewedAt: Date.parse("2026-11-18T09:30:00.000Z"),
    reviewCount: 3,
    mastery: 85,
    modeIds: ["interview"],
};

const ENTRIES: VocabularyEntryDto[] = [
    {
        id: "a1b2c3d4-0001-4000-8000-000000000001",
        term: "collaborate",
        translation: "сотрудничать",
        context: "We need to collaborate on this project.",
        exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
        sourceLessonId: null,
        stage: 1,
        nextDueAt: "2026-11-18T09:00:00.000Z",
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
    useVocabulary: typeof import("@/hooks/useVocabulary").useVocabulary;
    useAuthStore: typeof import("@/store/auth").useAuthStore;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const auth = await import("@/store/auth");
    const hook = await import("@/hooks/useVocabulary");

    return {
        useVocabulary: hook.useVocabulary,
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
    fetchVocabularyMock.mockReset();
    fetchVocabularyEntriesMock.mockReset();
    navigateMock.mockReset();
    toastErrorMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useVocabulary", () => {
    it("3.1 мок-режим: kind=mock из fetchVocabulary, real-источник не вызывается", async () => {
        fetchVocabularyMock.mockResolvedValue([MOCK_WORD]);
        const { useVocabulary } = await loadHook();

        const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });

        await waitFor(() =>
            expect(result.current.kind === "mock" && result.current.words).toHaveLength(1)
        );

        expect(result.current.kind).toBe("mock");
        expect(fetchVocabularyEntriesMock).not.toHaveBeenCalled();
    });

    it("3.2 real-режим: kind=real, записи доезжают, мок-источник не вызывается", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        fetchVocabularyEntriesMock.mockResolvedValue(ENTRIES);
        const { useVocabulary, useAuthStore } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });

        const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });

        await waitFor(() =>
            expect(result.current.kind === "real" && result.current.entries).toHaveLength(1)
        );

        expect(result.current.kind).toBe("real");
        expect(fetchVocabularyEntriesMock).toHaveBeenCalledTimes(1);
        expect(fetchVocabularyMock).not.toHaveBeenCalled();
    });

    it("3.3 real 401: тост один раз, сессия очищена, навигация ровно через 3000 мс", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useVocabulary, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchVocabularyEntriesMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        renderHook(() => useVocabulary(), { wrapper: Wrapper });

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

    it("3.4 real 401 повторно: гард держит один тост и одну навигацию", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useVocabulary, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchVocabularyEntriesMock.mockRejectedValue(new ApiError(401, "Unauthorized"));

        const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });

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

    it("3.5 real 429: без авто-повтора, ошибка отдаётся наружу", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useVocabulary, useAuthStore, ApiError } = await loadHook();
        useAuthStore.setState({ user: { ...USER } });
        fetchVocabularyEntriesMock.mockRejectedValue(new ApiError(429, "Too many requests"));

        const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.kind).toBe("real");
        expect(fetchVocabularyEntriesMock).toHaveBeenCalledTimes(1);
        expect(toastErrorMock).toHaveBeenCalledWith("states.error.title");
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it("3.6 real смена userId: новый ключ даёт новый запрос, старые данные не переиспользуются", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useVocabulary, useAuthStore } = await loadHook();
        const second: VocabularyEntryDto = {
            ...ENTRIES[0],
            id: "a1b2c3d4-0002-4000-8000-000000000002",
            term: "deadline",
        };
        fetchVocabularyEntriesMock.mockResolvedValueOnce(ENTRIES).mockResolvedValueOnce([second]);
        useAuthStore.setState({ user: { ...USER } });

        const { result } = renderHook(() => useVocabulary(), { wrapper: Wrapper });

        await waitFor(() =>
            expect(result.current.kind === "real" && result.current.entries[0]).toEqual(ENTRIES[0])
        );

        await act(async () => {
            useAuthStore.setState({ user: { ...USER, id: "u-2" } });
        });

        await waitFor(() => expect(fetchVocabularyEntriesMock).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(result.current.kind === "real" && result.current.entries[0]).toEqual(second)
        );
    });
});
