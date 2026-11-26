// ARCHITECT: useChat — единственное место, где живёт незавершённый ответ: тесты держат контракт «обрыв не
// сохраняется», повтор без дубля реплики, лимит, 401 через общий useAuthExpiry и мок-ветку. Сеть мокается:
// streamChatReply подменяется, поэтому SSE здесь не поднимается (его разбор проверяет src/api/chat.test.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { ChatReply } from "@/api/chat";
import type { ChatResult, RealChatResult } from "@/hooks/useChat";
import type { EnhancedChatSession } from "@/types/session";

const {
    streamChatReplyMock,
    fetchChatHistoryMock,
    sendMessageMock,
    fetchSessionByIdMock,
    toastErrorMock,
    navigateMock,
    tMock,
} = vi.hoisted(() => ({
    streamChatReplyMock: vi.fn(),
    fetchChatHistoryMock: vi.fn(),
    sendMessageMock: vi.fn(),
    fetchSessionByIdMock: vi.fn(),
    toastErrorMock: vi.fn(),
    navigateMock: vi.fn(),
    tMock: (key: string) => key,
}));

vi.mock("@/api/chat", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/chat")>();
    return {
        ...actual,
        fetchChatHistory: fetchChatHistoryMock,
        sendMessage: sendMessageMock,
        streamChatReply: streamChatReplyMock,
    };
});

vi.mock("@/api/sessions", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/sessions")>();
    return { ...actual, fetchSessionById: fetchSessionByIdMock };
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
    return { ...actual, useTranslation: () => ({ t: tMock, i18n: { language: "ru" } }) };
});

const SESSION_ID = "5b1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11";

const REPLY: ChatReply = {
    reply: "Good start. Let's fix one thing.",
    corrections: [
        {
            fragment: "I agree with you.",
            rule: "agree не требует вспомогательного am",
            examples: ["I agree with you."],
        },
    ],
    quiz: {
        type: "choice",
        prompt: "Pick the best option:",
        options: [
            { id: "a", text: "resolve" },
            { id: "b", text: "get by" },
        ],
        answerId: "a",
    },
    vocabWord: { term: "deadline", translation: "срок", context: "The deadline is Friday." },
    usage: {
        promptTokens: 120,
        completionTokens: 60,
        model: "deepseek/deepseek-v4.1-flash",
        messagesRemaining: 19,
    },
};

function Wrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return createElement(MemoryRouter, null, children);
}

// ARCHITECT: свежий реестр модулей на тест: USE_MOCKS читается при импорте, а модульный гард 401 из
// useAuthExpiry должен начинать эпизод с чистого состояния.
async function loadHook(): Promise<{
    useChat: typeof import("@/hooks/useChat").useChat;
    ApiError: typeof import("@/api/client").ApiError;
}> {
    vi.resetModules();
    const client = await import("@/api/client");
    const hook = await import("@/hooks/useChat");

    return { useChat: hook.useChat, ApiError: client.ApiError };
}

function realOf(chat: ChatResult): RealChatResult {
    if (chat.kind !== "real") throw new Error("ожидалась real-ветка");

    return chat;
}

function mockOf(chat: ChatResult): Extract<ChatResult, { kind: "mock" }> {
    if (chat.kind !== "mock") throw new Error("ожидалась мок-ветка");

    return chat;
}

beforeEach(() => {
    fetchSessionByIdMock.mockResolvedValue(null);
    fetchChatHistoryMock.mockResolvedValue([]);
});

afterEach(() => {
    streamChatReplyMock.mockReset();
    fetchChatHistoryMock.mockReset();
    sendMessageMock.mockReset();
    fetchSessionByIdMock.mockReset();
    toastErrorMock.mockReset();
    navigateMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useChat", () => {
    it("1.1 real: дельты собираются, done даёт карточки и остаток квоты", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        streamChatReplyMock.mockImplementation(
            async (_input: unknown, handlers: { onDelta: (text: string) => void }) => {
                handlers.onDelta("Good ");
                handlers.onDelta("start.");

                return REPLY;
            }
        );
        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        // ARCHITECT: сначала ждём загрузку истории: она заменяет ленту, и отправка до неё потеряла бы реплику.
        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        act(() => {
            realOf(result.current).send("  I am agree with you.  ");
        });

        await waitFor(() => expect(realOf(result.current).messages[1]?.content).toBe(REPLY.reply));

        const chat = realOf(result.current);

        expect(streamChatReplyMock).toHaveBeenCalledWith(
            { sessionId: SESSION_ID, message: "I am agree with you." },
            expect.anything()
        );
        expect(chat.messages).toHaveLength(2);
        expect(chat.messages[0]).toMatchObject({
            role: "user",
            content: "I am agree with you.",
            cards: null,
        });
        expect(chat.messages[1]?.content).toBe(REPLY.reply);
        expect(chat.messages[1]?.cards?.corrections).toHaveLength(1);
        expect(chat.messages[1]?.cards?.vocabWord?.term).toBe("deadline");
        expect(chat.messagesRemaining).toBe(19);
        expect(chat.error).toBeNull();
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("1.2 обрыв: частичный ответ удаляется, повтор не дублирует реплику", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat, ApiError } = await loadHook();

        streamChatReplyMock.mockImplementation(
            async (_input: unknown, handlers: { onDelta: (text: string) => void }) => {
                handlers.onDelta("Good ");

                throw new ApiError(500, "CHAT_STREAM_FAILED");
            }
        );

        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        act(() => {
            realOf(result.current).send("I am agree with you.");
        });

        await waitFor(() => expect(realOf(result.current).error).toBe("stream"));

        const afterFailure = realOf(result.current);

        expect(afterFailure.messages).toHaveLength(1);
        expect(afterFailure.messages[0]?.role).toBe("user");
        expect(afterFailure.isStreaming).toBe(false);
        expect(toastErrorMock).toHaveBeenCalledWith("feed.error");

        streamChatReplyMock.mockResolvedValue(REPLY);

        act(() => {
            realOf(result.current).retry();
        });

        await waitFor(() => expect(realOf(result.current).messages).toHaveLength(2));
        await waitFor(() => expect(realOf(result.current).messages[1]?.content).toBe(REPLY.reply));

        const afterRetry = realOf(result.current);

        expect(streamChatReplyMock).toHaveBeenCalledTimes(2);
        expect(afterRetry.messages.filter((message) => message.role === "user")).toHaveLength(1);
        expect(afterRetry.messages[1]?.content).toBe(REPLY.reply);
        expect(afterRetry.error).toBeNull();
    });

    it("1.3 лимит: 429 даёт ошибку лимита и свой тост", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat, ApiError } = await loadHook();

        streamChatReplyMock.mockRejectedValue(new ApiError(429, "RATE_LIMITED"));

        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        act(() => {
            realOf(result.current).send("Hello");
        });

        await waitFor(() => expect(realOf(result.current).error).toBe("limit"));

        expect(toastErrorMock).toHaveBeenCalledWith("feed.limit");
        expect(realOf(result.current).messages).toHaveLength(1);
    });

    it("1.4 401: тост и редирект отдаёт общий useAuthExpiry, потока ошибки нет", async () => {
        vi.useFakeTimers();
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat, ApiError } = await loadHook();

        streamChatReplyMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED"));

        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await act(async () => {
            realOf(result.current).send("Hello");
            await vi.advanceTimersByTimeAsync(0);
        });

        // ARCHITECT: тост терминального 401 даёт общий хук, а не чат: своих сообщений об ошибке нет.
        expect(toastErrorMock).toHaveBeenCalledWith("errors.sessionExpired");
        expect(toastErrorMock).not.toHaveBeenCalledWith("feed.error");
        expect(navigateMock).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(3000);
        });

        expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });

    it("1.5 уход со страницы обрывает поток: ошибки и тоста нет", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        // ARCHITECT: присваивание идёт из коллбэка, поэтому сигнал читается через поле объекта: контроль потока
        // типов сузил бы внешнюю переменную до null.
        const captured: { signal: AbortSignal | null } = { signal: null };

        streamChatReplyMock.mockImplementation(
            (_input: unknown, handlers: { signal: AbortSignal }) => {
                captured.signal = handlers.signal;

                return new Promise<ChatReply>(() => undefined);
            }
        );

        const { useChat } = await loadHook();
        const { result, unmount } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        act(() => {
            realOf(result.current).send("Hello");
        });

        expect(realOf(result.current).isStreaming).toBe(true);

        unmount();

        expect(captured.signal?.aborted).toBe(true);
        expect(toastErrorMock).not.toHaveBeenCalled();
    });

    it("1.6 мок-ветка: сессия из хранилища, отправка через мок-хранилище, поток не поднимается", async () => {
        const session: EnhancedChatSession = {
            id: SESSION_ID,
            userId: "user_1",
            title: "Новая сессия",
            createdAt: Date.parse("2026-11-18T09:14:00.000Z"),
            repetitorId: "miya",
            learningMode: "speaking",
            progress: { completedLessons: 0, totalLessons: 8, wordsLearned: 0, streakDays: 0 },
            lastActivityAt: Date.parse("2026-11-18T09:41:00.000Z"),
            messages: [],
        };

        fetchSessionByIdMock.mockResolvedValue(session);
        sendMessageMock.mockReturnValue(session);

        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(mockOf(result.current).isLoading).toBe(false));
        expect(mockOf(result.current).session?.id).toBe(SESSION_ID);

        act(() => {
            mockOf(result.current).send("Hi");
        });

        expect(sendMessageMock).toHaveBeenCalledWith(SESSION_ID, "Hi");
        expect(streamChatReplyMock).not.toHaveBeenCalled();
        expect(mockOf(result.current).isStreaming).toBe(false);
    });

    it("1.7 real: сохранённая история загружается вместе с карточками ответа", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        fetchChatHistoryMock.mockResolvedValue([
            {
                id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a01",
                role: "user",
                content: "Yesterday I go to the cinema.",
                cards: null,
            },
            {
                id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a02",
                role: "assistant",
                content: REPLY.reply,
                cards: {
                    corrections: REPLY.corrections,
                    quiz: REPLY.quiz,
                    vocabWord: REPLY.vocabWord,
                },
            },
        ]);
        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        const chat = realOf(result.current);

        expect(fetchChatHistoryMock).toHaveBeenCalledWith(SESSION_ID);
        expect(chat.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
        expect(chat.messages[0]?.cards).toBeNull();
        expect(chat.messages[1]?.cards?.quiz).toEqual(REPLY.quiz);
        expect(chat.error).toBeNull();
    });

    it("1.8 real: сбой истории даёт полосу ошибки, кнопка повтора перезагружает её", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat, ApiError } = await loadHook();
        fetchChatHistoryMock.mockRejectedValue(new ApiError(500, "CHAT_STREAM_FAILED"));
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).error).toBe("stream"));

        expect(realOf(result.current).messages).toHaveLength(0);
        // ARCHITECT: сбой загрузки истории — это не ошибка отправки: тостом его не сопровождаем, лечит кнопка.
        expect(toastErrorMock).not.toHaveBeenCalled();

        fetchChatHistoryMock.mockResolvedValue([
            {
                id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a03",
                role: "user",
                content: "Hello",
                cards: null,
            },
        ]);

        act(() => {
            realOf(result.current).retry();
        });

        await waitFor(() => expect(realOf(result.current).messages).toHaveLength(1));

        expect(fetchChatHistoryMock).toHaveBeenCalledTimes(2);
        expect(realOf(result.current).error).toBeNull();
        expect(streamChatReplyMock).not.toHaveBeenCalled();
    });
});
