// ARCHITECT: чат-хук по образцу read-хуков (useSessions/useVocabulary): union mock/real по USE_MOCKS. Мок-ветка
// работает на общем мок-хранилище сессий и сохраняет прежнее поведение, real-ветка читает SSE POST /api/chat.
// ARCHITECT: незавершённый ответ не сохраняется: обрыв, ошибка потока и лимит убирают реплику ассистента из
// ленты, а текст последнего сообщения остаётся в ref — кнопка повтора отправляет его снова. 401 отдаётся
// общему useAuthExpiry: один тост и один редирект на всю страницу.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { sendMessage, streamChatReply } from "@/api/chat";
import type { ChatCorrection, ChatQuiz, ChatVocabWord } from "@/api/chat";
import { fetchSessionById } from "@/api/sessions";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { useMockQuery } from "@/hooks/useMockQuery";
import { USE_MOCKS } from "@/lib/env";
import { toast } from "@/store/toast";
import type { EnhancedChatSession } from "@/types/session";

/** Карточки ответа: правки, квиз и слово урока — ровно то, что пришло событием done. */
export interface ChatCards {
    readonly corrections: readonly ChatCorrection[];
    readonly quiz: ChatQuiz | null;
    readonly vocabWord: ChatVocabWord | null;
}

/** Сообщение ленты чата: реплика и карточки ответа (у реплики ученика карточек нет). */
export interface ChatFeedMessage {
    readonly id: string;
    readonly role: "user" | "assistant";
    readonly content: string;
    readonly cards: ChatCards | null;
}

/** Причина, по которой ответ не пришёл: исчерпан дневной лимит или сорвался поток. */
export type ChatErrorKind = "limit" | "stream";

interface ChatCommon {
    readonly isStreaming: boolean;
    readonly error: ChatErrorKind | null;
    readonly messagesRemaining: number | null;
    readonly send: (text: string) => void;
    /** Повтор последнего сообщения: доступен после обрыва, ошибки потока и лимита. */
    readonly retry: () => void;
}

export interface MockChatResult extends ChatCommon {
    readonly kind: "mock";
    readonly isLoading: boolean;
    readonly session: EnhancedChatSession | null;
    /** Правки из настроек сессии возвращаются сюда: страница остаётся владельцем того, что видно. */
    readonly applySession: (session: EnhancedChatSession) => void;
}

export interface RealChatResult extends ChatCommon {
    readonly kind: "real";
    readonly messages: readonly ChatFeedMessage[];
}

export type ChatResult = MockChatResult | RealChatResult;

const NOOP = (): void => undefined;
const EMPTY_SESSION = null;

function useMockChat(sessionId: string): MockChatResult {
    // ARCHITECT: в real-режиме мок-хранилище не читается вовсе: запрос сразу отдаёт null, а лента живёт в
    // useRealChat. Загрузка остаётся скелетоном и в мок-ветке, как было у страницы.
    const { data: loaded, isLoading } = useMockQuery<EnhancedChatSession | null>(
        () => (USE_MOCKS ? fetchSessionById(sessionId) : Promise.resolve(EMPTY_SESSION)),
        [sessionId, USE_MOCKS]
    );
    const [patch, setPatch] = useState<EnhancedChatSession | null>(null);
    // ARCHITECT: заплата действует только для своей сессии: после перехода на другую id не совпадает, и
    // показывается то, что пришло из хранилища.
    const session = patch !== null && patch.id === sessionId ? patch : loaded;

    const send = useCallback(
        (text: string) => {
            if (!USE_MOCKS) return;

            const updated = sendMessage(sessionId, text);
            if (updated) setPatch(updated);
        },
        [sessionId]
    );

    return {
        kind: "mock",
        isLoading,
        isStreaming: false,
        error: null,
        messagesRemaining: null,
        session,
        send,
        retry: NOOP,
        applySession: setPatch,
    };
}

interface LiveChatState {
    readonly sessionId: string;
    readonly messages: readonly ChatFeedMessage[];
    readonly isStreaming: boolean;
    readonly error: ChatErrorKind | null;
    readonly messagesRemaining: number | null;
}

// ARCHITECT: состояние помечено своей сессией: при переходе на другую id лента не переиспользуется, а новый
// сеанс начинается с чистого листа — сброс в эффекте запрещён правилом react-hooks/set-state-in-effect.
function withSession(previous: LiveChatState, sessionId: string): LiveChatState {
    return previous.sessionId === sessionId
        ? previous
        : { sessionId, messages: [], isStreaming: false, error: null, messagesRemaining: null };
}

function idleState(sessionId: string): LiveChatState {
    return { sessionId, messages: [], isStreaming: false, error: null, messagesRemaining: null };
}

function useRealChat(sessionId: string): RealChatResult {
    const { t } = useTranslation("chat");
    const [state, setState] = useState<LiveChatState>(() => idleState(sessionId));
    const [expired, setExpired] = useState<unknown>(null);
    const abortRef = useRef<AbortController | null>(null);
    // ARCHITECT: последний отправленный текст живёт в ref: после обрыва повтор отправляет именно его, а не
    // то, что пользователь успел набрать в поле заново.
    const pendingRef = useRef<string | null>(null);

    // ARCHITECT: 401 терминальный (apiStream уже пробовал refresh) уходит в общий хук: тост и редирект — его.
    useAuthExpiry(expired, expired === null);

    const run = useCallback(
        async (content: string, appendUser: boolean): Promise<void> => {
            const controller = new AbortController();
            abortRef.current = controller;
            pendingRef.current = content;

            const assistantId = crypto.randomUUID();
            const placeholder: ChatFeedMessage = {
                id: assistantId,
                role: "assistant",
                content: "",
                cards: null,
            };

            setState((previous) => {
                const base = withSession(previous, sessionId);
                const userMessage: ChatFeedMessage = {
                    id: crypto.randomUUID(),
                    role: "user",
                    content,
                    cards: null,
                };

                return {
                    ...base,
                    messages: appendUser
                        ? [...base.messages, userMessage, placeholder]
                        : [...base.messages, placeholder],
                    isStreaming: true,
                    error: null,
                };
            });

            try {
                const reply = await streamChatReply(
                    { sessionId, message: content },
                    {
                        signal: controller.signal,
                        onDelta: (text) =>
                            setState((previous) => ({
                                ...previous,
                                messages: previous.messages.map((message) =>
                                    message.id === assistantId
                                        ? { ...message, content: message.content + text }
                                        : message
                                ),
                            })),
                    }
                );

                setState((previous) => ({
                    ...previous,
                    messages: previous.messages.map((message) =>
                        message.id === assistantId
                            ? {
                                  ...message,
                                  content: reply.reply,
                                  cards: {
                                      corrections: reply.corrections,
                                      quiz: reply.quiz,
                                      vocabWord: reply.vocabWord,
                                  },
                              }
                            : message
                    ),
                    messagesRemaining: reply.usage.messagesRemaining,
                    error: null,
                }));
            } catch (failure) {
                // ARCHITECT: неудачу не сохраняем: незавершённая реплика ассистента уходит из ленты целиком, а
                // реплика ученика остаётся — повтор отправит тот же текст и допишет новый ответ.
                setState((previous) => ({
                    ...previous,
                    messages: previous.messages.filter((message) => message.id !== assistantId),
                }));

                // ARCHITECT: отмена (уход со страницы) — не ошибка: ни тоста, ни сообщения о сбое, ни редиректа.
                if (controller.signal.aborted) return;

                if (failure instanceof ApiError && failure.statusCode === 401) {
                    setExpired(failure);
                    setState((previous) => ({ ...previous, error: "stream" }));
                    return;
                }

                const kind: ChatErrorKind =
                    failure instanceof ApiError && failure.statusCode === 429 ? "limit" : "stream";

                setState((previous) => ({ ...previous, error: kind }));
                toast.error(kind === "limit" ? t("feed.limit") : t("feed.error"));
            } finally {
                abortRef.current = null;
                setState((previous) => ({ ...previous, isStreaming: false }));
            }
        },
        [sessionId, t]
    );

    const send = useCallback(
        (text: string) => {
            const content = text.trim();
            if (USE_MOCKS || content === "" || abortRef.current !== null) return;

            void run(content, true);
        },
        [run]
    );

    const retry = useCallback(() => {
        const content = pendingRef.current;
        if (USE_MOCKS || content === null || abortRef.current !== null) return;

        void run(content, false);
    }, [run]);

    // ARCHITECT: уход со страницы обрывает поток: сервер возвращает резерв квоты, а браузер не держит соединение.
    useEffect(
        () => () => {
            abortRef.current?.abort();
        },
        []
    );

    const live = withSession(state, sessionId);

    return {
        kind: "real",
        isStreaming: live.isStreaming,
        error: live.error,
        messagesRemaining: live.messagesRemaining,
        messages: live.messages,
        send,
        retry,
    };
}

// ARCHITECT: обе ветки вызываются всегда, а выбирает одна: условный вызов хука нарушил бы правила хуков.
// USE_MOCKS — модульная константа, поэтому порядок и число хуков между рендерами не меняются.
export function useChat(sessionId: string): ChatResult {
    const mock = useMockChat(sessionId);
    const real = useRealChat(sessionId);

    return USE_MOCKS ? mock : real;
}
