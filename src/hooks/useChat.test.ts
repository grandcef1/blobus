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
    sendQuizAnswerMock,
    fetchSessionByIdMock,
    toastErrorMock,
    navigateMock,
    tMock,
} = vi.hoisted(() => ({
    streamChatReplyMock: vi.fn(),
    fetchChatHistoryMock: vi.fn(),
    sendMessageMock: vi.fn(),
    sendQuizAnswerMock: vi.fn(),
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
        sendQuizAnswer: sendQuizAnswerMock,
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
const MESSAGE_ID = "7c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a22";

/** План урока из ответа сервера: карточка цели. Целевых слов в контракте нет по конструкции. */
const PLAN = {
    goal: "speak more freely in everyday conversation in two or three connected sentences.",
    rule: "Present Simple for habits and routines",
    step: 1,
    total: 6,
    wordsDone: 1,
    wordsTotal: 5,
    completed: false,
} as const;

const REPLY: ChatReply = {
    reply: "Good start. Let's fix one thing.",
    // ARCHITECT: по умолчанию ход из одной части: вторая появляется только когда её прислал сервер.
    followUp: null,
    plan: null,
    // ARCHITECT: id ответа, задача и раскрытый ответ приходят только когда сервер их прислал.
    messageId: null,
    pending: null,
    reveal: null,
    // ARCHITECT: блок слов приходит только в итоговом ходу: в обычном ответе он пуст.
    words: [],
    corrections: [
        {
            fragment: "I agree with you.",
            rule: "agree не требует вспомогательного am",
            examples: ["I agree with you."],
            kind: "error",
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
    voiceId: "en-US-female",
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
    // ARCHITECT: история приходит конвертом: сообщения и план урока.
    fetchChatHistoryMock.mockResolvedValue({ messages: [], plan: null });
});

afterEach(() => {
    streamChatReplyMock.mockReset();
    fetchChatHistoryMock.mockReset();
    sendMessageMock.mockReset();
    sendQuizAnswerMock.mockReset();
    fetchSessionByIdMock.mockReset();
    toastErrorMock.mockReset();
    navigateMock.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("useChat", () => {
    it("1.12 real: блок слов итогового хода приходит с ответом, а вторая часть ждёт паузы", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat } = await loadHook();

        streamChatReplyMock.mockResolvedValue({
            ...REPLY,
            followUp: "Now say the same about your week.",
            words: [
                { word: "deadline", meaning: "срок", status: "introduced" },
                { word: "improve", meaning: "улучшать", status: "hidden" },
            ],
        });
        vi.useFakeTimers();

        try {
            const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            act(() => {
                realOf(result.current).send("Yesterday I went home.");
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            // ARCHITECT: пока идёт пауза перед второй частью, хук держит признак ожидания: по нему лента рисует
            // индикатор набора в группе репетитора без аватара (§спец. 1).
            const chat = realOf(result.current);

            expect(chat.isAwaitingFollowUp).toBe(true);
            expect(chat.messages[1]?.words).toHaveLength(2);
            expect(chat.messages[1]?.words[0]?.status).toBe("introduced");
            // Время реплики нужно группировке: у живого сообщения оно своё, а не нулевое.
            expect(chat.messages[1]?.createdAt).toBeGreaterThan(0);

            const { FOLLOW_UP_PAUSE_MS } = await import("@/hooks/useChat");

            await act(async () => {
                await vi.advanceTimersByTimeAsync(FOLLOW_UP_PAUSE_MS);
            });

            expect(realOf(result.current).isAwaitingFollowUp).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it("1.13 пауза второй части лежит в окне спецификации", async () => {
        // ARCHITECT: 500-900 мс — окно из спецификации; пауза длиннее 1.5 с выглядела бы зависанием.
        const { FOLLOW_UP_PAUSE_MS } = await import("@/hooks/useChat");

        expect(FOLLOW_UP_PAUSE_MS).toBeGreaterThanOrEqual(500);
        expect(FOLLOW_UP_PAUSE_MS).toBeLessThanOrEqual(900);
        expect(FOLLOW_UP_PAUSE_MS).toBeLessThan(1500);
    });

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

    it("1.1.1 real: ответ на задание уходит отдельным вызовом, а вторая часть хода встаёт в ленту", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        const { useChat } = await loadHook();

        streamChatReplyMock.mockResolvedValue({ ...REPLY, messageId: MESSAGE_ID });
        sendQuizAnswerMock.mockResolvedValue({
            correct: true,
            quiz: null,
            released: "Now make it a question.",
            reveal: null,
        });
        vi.useFakeTimers();

        try {
            const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            act(() => {
                realOf(result.current).send("Yesterday I went home.");
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            // ARCHITECT: id сохранённого ответа пришёл событием done: по нему уходит ответ на задание.
            expect(realOf(result.current).messages[1]?.serverId).toBe(MESSAGE_ID);
            // ARCHITECT: пока задание не отвечено, второй части хода в ленте нет: её придерживает сервер.
            expect(realOf(result.current).messages).toHaveLength(2);

            act(() => {
                realOf(result.current).answerQuiz(MESSAGE_ID, "b");
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            expect(sendQuizAnswerMock).toHaveBeenCalledWith({
                messageId: MESSAGE_ID,
                answer: "b",
            });
            // ARCHITECT: состояние задания пришло ответом сервера: карточка закрыта и после перезагрузки.
            expect(realOf(result.current).messages[1]?.quizState).toEqual({
                answered: true,
                selected: "b",
                correct: true,
                revealed: false,
            });

            const { FOLLOW_UP_PAUSE_MS } = await import("@/hooks/useChat");

            // ARCHITECT: вторая часть хода встаёт в ленту после той же паузы, что и вторая часть обычного хода.
            expect(realOf(result.current).isAwaitingFollowUp).toBe(true);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(FOLLOW_UP_PAUSE_MS);
            });

            const chat = realOf(result.current);

            expect(chat.messages).toHaveLength(3);
            expect(chat.messages[2]?.role).toBe("assistant");
            expect(chat.messages[2]?.content).toBe("Now make it a question.");
            expect(chat.messages[2]?.voiceId).toBe("en-US-female");
            expect(chat.isAwaitingFollowUp).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it("1.1.2 real: закрытое задание остаётся закрытым после перезагрузки ленты", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        fetchChatHistoryMock.mockResolvedValue({
            messages: [
                {
                    id: MESSAGE_ID,
                    role: "assistant",
                    content: "Pick one.",
                    cards: {
                        corrections: [],
                        quiz: {
                            type: "choice",
                            prompt: "Pick:",
                            options: [
                                { id: "a", text: "go" },
                                { id: "b", text: "went" },
                            ],
                            answerId: "b",
                        },
                        vocabWord: null,
                    },
                    voiceId: null,
                    createdAt: 0,
                    words: [],
                    // ARCHITECT: состояние задания лежит в payload: после перезагрузки карточка запирается (§спец. 9).
                    quizState: { answered: true, selected: "a", correct: false, revealed: true },
                },
            ],
            plan: null,
        });
        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        const message = realOf(result.current).messages[0];

        expect(message?.serverId).toBe(MESSAGE_ID);
        expect(message?.quizState).toEqual({
            answered: true,
            selected: "a",
            correct: false,
            revealed: true,
        });
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
        fetchChatHistoryMock.mockResolvedValue({
            messages: [
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a01",
                    role: "user",
                    content: "Yesterday I go to the cinema.",
                    cards: null,
                    createdAt: 0,
                    words: [],
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
                    createdAt: 0,
                    words: [],
                },
            ],
            plan: PLAN,
        });
        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        const chat = realOf(result.current);

        expect(fetchChatHistoryMock).toHaveBeenCalledWith(SESSION_ID);
        expect(chat.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
        expect(chat.messages[0]?.cards).toBeNull();
        expect(chat.messages[1]?.cards?.quiz).toEqual(REPLY.quiz);
        expect(chat.error).toBeNull();
        // ARCHITECT: план приходит вместе с историей: карточка цели видна сразу после перезагрузки ленты.
        expect(chat.plan?.rule).toBe(PLAN.rule);
        expect(chat.plan?.total).toBe(PLAN.total);
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

        fetchChatHistoryMock.mockResolvedValue({
            messages: [
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a03",
                    role: "user",
                    content: "Hello",
                    cards: null,
                    createdAt: 0,
                    words: [],
                },
            ],
            plan: null,
        });

        act(() => {
            realOf(result.current).retry();
        });

        await waitFor(() => expect(realOf(result.current).messages).toHaveLength(1));

        expect(fetchChatHistoryMock).toHaveBeenCalledTimes(2);
        expect(realOf(result.current).error).toBeNull();
        expect(streamChatReplyMock).not.toHaveBeenCalled();
    });

    it("1.9 real: профиль голоса из done попадает в реплику репетитора", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        streamChatReplyMock.mockResolvedValue(REPLY);

        const { useChat } = await loadHook();
        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        act(() => {
            realOf(result.current).send("Hello");
        });

        // ARCHITECT: ждём именно завершения ответа: placeholder встаёт в ленту сразу, а профиль голоса
        // приходит событием done.
        await waitFor(() => expect(realOf(result.current).messages[1]?.content).toBe(REPLY.reply));

        // ARCHITECT: реплика ученика озвучки не имеет, у ответа профиль голоса приходит с сервера.
        expect(realOf(result.current).messages[0]?.voiceId).toBeNull();
        expect(realOf(result.current).messages[1]?.voiceId).toBe("en-US-female");
    });

    it("1.10 стоп отменяет поток: прерванный ответ не сохраняется, повтор доступен", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        // ARCHITECT: присваивание идёт из коллбэка, поэтому сигнал читается через поле объекта.
        const captured: { signal: AbortSignal | null } = { signal: null };
        const { useChat, ApiError } = await loadHook();

        streamChatReplyMock.mockImplementation(
            (_input: unknown, handlers: { signal: AbortSignal }) =>
                new Promise<ChatReply>((_resolve, reject) => {
                    captured.signal = handlers.signal;
                    handlers.signal.addEventListener("abort", () =>
                        reject(new ApiError(0, "aborted"))
                    );
                })
        );

        const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

        await waitFor(() => expect(realOf(result.current).isLoading).toBe(false));

        act(() => {
            realOf(result.current).send("I am agree with you.");
        });

        expect(realOf(result.current).isStreaming).toBe(true);

        act(() => {
            realOf(result.current).stop();
        });

        await waitFor(() => expect(realOf(result.current).isStreaming).toBe(false));

        const afterStop = realOf(result.current);

        expect(captured.signal?.aborted).toBe(true);
        // ARCHITECT: прерванная реплика ассистента уходит из ленты целиком, реплика ученика остаётся, и
        // ошибки нет: остановка — не сбой (§16.9).
        expect(afterStop.messages).toHaveLength(1);
        expect(afterStop.messages[0]?.role).toBe("user");
        expect(afterStop.error).toBeNull();
        expect(toastErrorMock).not.toHaveBeenCalled();

        streamChatReplyMock.mockResolvedValue(REPLY);

        act(() => {
            realOf(result.current).retry();
        });

        await waitFor(() => expect(realOf(result.current).messages).toHaveLength(2));
        expect(
            realOf(result.current).messages.filter((message) => message.role === "user")
        ).toHaveLength(1);
    });

    it("1.11 real: ход из двух частей — разбор и следующая активность отдельными сообщениями через паузу", async () => {
        vi.stubEnv("VITE_USE_MOCKS", "false");
        streamChatReplyMock.mockResolvedValue({
            ...REPLY,
            followUp: "Now make it a question.",
            plan: PLAN,
        });

        const { useChat } = await loadHook();

        // ARCHITECT: пауза между частями измеряется таймером, поэтому время здесь под контролем: иначе
        // «сначала разбор, потом активность» проверялось бы гонкой, а не порядком.
        vi.useFakeTimers();

        try {
            const { result } = renderHook(() => useChat(SESSION_ID), { wrapper: Wrapper });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            act(() => {
                realOf(result.current).send("Yesterday I go to the cinema.");
            });

            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            // ARCHITECT: первая часть уже в ленте, второй ещё нет — пауза не истекла.
            expect(realOf(result.current).messages).toHaveLength(2);
            expect(realOf(result.current).messages[1]?.content).toBe(REPLY.reply);

            await act(async () => {
                await vi.advanceTimersByTimeAsync(700);
            });

            const chat = realOf(result.current);

            expect(chat.messages).toHaveLength(3);
            expect(chat.messages[2]?.role).toBe("assistant");
            expect(chat.messages[2]?.content).toBe("Now make it a question.");
            expect(chat.messages[2]?.voiceId).toBe("en-US-female");
            // ARCHITECT: план из ответа обновляет карточку цели без перезагрузки ленты.
            expect(chat.plan?.rule).toBe(PLAN.rule);
            expect(chat.plan?.step).toBe(PLAN.step);
        } finally {
            vi.useRealTimers();
        }
    });
});
