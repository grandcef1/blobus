// ARCHITECT: чат-хук по образцу read-хуков (useSessions/useVocabulary): union mock/real по USE_MOCKS. Мок-ветка
// работает на общем мок-хранилище сессий и сохраняет прежнее поведение, real-ветка читает SSE POST /api/chat.
// ARCHITECT: незавершённый ответ не сохраняется: обрыв, ошибка потока и лимит убирают реплику ассистента из
// ленты, а текст последнего сообщения остаётся в ref — кнопка повтора отправляет его снова. 401 отдаётся
// общему useAuthExpiry: один тост и один редирект на всю страницу.

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchChatHistory, sendMessage, streamChatReply } from "@/api/chat";
import type { ChatCards, ChatHistoryMessage } from "@/api/chat";
import { fetchSessionById } from "@/api/sessions";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { useMockQuery } from "@/hooks/useMockQuery";
import { USE_MOCKS } from "@/lib/env";
import { toast } from "@/store/toast";
import type { EnhancedChatSession } from "@/types/session";

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
    /** true, пока история сессии в пути: ленте нужен скелетон, а не пустой экран. */
    readonly isLoading: boolean;
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
    /** false до завершения загрузки истории: лента показывает скелетон, пока сообщения в пути. */
    readonly historyLoaded: boolean;
}

// ARCHITECT: состояние помечено своей сессией: при переходе на другую id лента не переиспользуется, а новый
// сеанс начинается с чистого листа — сброс в эффекте запрещён правилом react-hooks/set-state-in-effect.
function withSession(previous: LiveChatState, sessionId: string): LiveChatState {
    return previous.sessionId === sessionId
        ? previous
        : {
              sessionId,
              messages: [],
              isStreaming: false,
              error: null,
              messagesRemaining: null,
              historyLoaded: false,
          };
}

function idleState(sessionId: string): LiveChatState {
    return {
        sessionId,
        messages: [],
        isStreaming: false,
        error: null,
        messagesRemaining: null,
        historyLoaded: false,
    };
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

    const applyHistory = useCallback(
        (history: readonly ChatHistoryMessage[]): void => {
            setState((previous) => ({
                ...withSession(previous, sessionId),
                messages: history.map((message) => ({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    cards: message.cards,
                })),
                historyLoaded: true,
                // ARCHITECT: удачная загрузка снимает прошлую ошибку: кнопка повтора возвращает ленту, а не баннер.
                error: null,
            }));
        },
        [sessionId]
    );

    const applyHistoryFailure = useCallback(
        (failure: unknown): void => {
            // ARCHITECT: сбой истории не отменяет диалог: лента показывает полосу ошибки с повтором, а
            // терминальный 401 уходит общему useAuthExpiry — реакция на истёкшую сессия одна на все чтения.
            if (failure instanceof ApiError && failure.statusCode === 401) setExpired(failure);

            setState((previous) => ({
                ...withSession(previous, sessionId),
                historyLoaded: true,
                error: "stream",
            }));
        },
        [sessionId]
    );

    // ARCHITECT: состояние ставится только из колбэка запроса (как в useMockQuery): правило
    // react-hooks/set-state-in-effect запрещает синхронный setState в теле эффекта, а ожидание ответа — это уже
    // асинхронная граница.
    useEffect(() => {
        if (USE_MOCKS) return;

        let isActive = true;

        void fetchChatHistory(sessionId).then(
            (history) => {
                if (isActive) applyHistory(history);
            },
            (failure: unknown) => {
                if (isActive) applyHistoryFailure(failure);
            }
        );

        return () => {
            isActive = false;
        };
    }, [sessionId, applyHistory, applyHistoryFailure]);

    /** Повторная загрузка истории: тот же путь, что у эффекта, но по кнопке — setState вне эффекта разрешён. */
    const reloadHistory = useCallback(async (): Promise<void> => {
        try {
            applyHistory(await fetchChatHistory(sessionId));
        } catch (failure) {
            applyHistoryFailure(failure);
        }
    }, [applyHistory, applyHistoryFailure, sessionId]);

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

    // ARCHITECT: повтор возвращает диалог к жизни: есть неотправленное сообщение — отправляем его, иначе
    // перезагружаем историю: сбой загрузки ленты лечится тем же кнопочным повтором.
    const retry = useCallback(() => {
        if (USE_MOCKS || abortRef.current !== null) return;

        const content = pendingRef.current;

        if (content === null) {
            void reloadHistory();
            return;
        }

        void run(content, false);
    }, [reloadHistory, run]);

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
        isLoading: !live.historyLoaded,
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
