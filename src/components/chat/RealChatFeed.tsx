// ARCHITECT: лента реального чата: реплики рисует MessageBubble (одна разметка пузыря на весь продукт), а
// карточки ответа идут под репликой репетитора. Отступ pl-11 выравнивает карточки по тексту пузыря: аватар
// size-8 (2rem) плюс gap-3 (0.75rem) — колонка совпадает без пустого блока-заполнителя.
// ARCHITECT: aria-live="polite" на постоянном контейнере объявляет растущий ответ: текст приходит дельт-ами,
// и без live-региона скринридер прочитал бы только кадр по уходу фокуса (как в строке разбора викторины).
// ARCHITECT: пока ответ печатается, рядом с подписью встаёт кнопка остановки: прерванная генерация не
// сохраняется, а повтор доступен из той же ленты (server/routes/chat.ts возвращает резерв квоты, §16.7).

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { ChatErrorKind, ChatFeedMessage } from "@/hooks/useChat";
import { stopPlayback } from "@/lib/speechPlayback";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { CorrectionsRow } from "./messages/CorrectionsRow";
import { MessageBubble } from "./messages/MessageBubble";
import { QuizRow } from "./messages/QuizRow";
import { VocabRow } from "./messages/VocabRow";

interface RealChatFeedProps {
    readonly messages: readonly ChatFeedMessage[];
    readonly session: EnhancedChatSession;
    readonly isStreaming: boolean;
    readonly error: ChatErrorKind | null;
    readonly messagesRemaining: number | null;
    /** Настройка voiceEnabled: выключена — кнопки озвучки в ленте нет. */
    readonly voiceEnabled: boolean;
    /** Тариф из entitlements: pro озвучивает провайдер, остальные читают браузерным синтезом. */
    readonly proPlan: boolean;
    readonly onRetry: () => void;
    readonly onStop: () => void;
}

const RETRY_BUTTON =
    "flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:border-white/25 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

// ARCHITECT: карточки рисуются отдельными блоками, поэтому у сообщения всегда тип "text": legacy-ветки
// MessageRenderer сработали бы на неполных метаданных.
function toBubbleMessage(message: ChatFeedMessage, sessionId: string): EnhancedMessage {
    return {
        id: message.id,
        sessionId,
        role: message.role,
        content: message.content,
        timestamp: Date.now(),
        type: "text",
    };
}

export function RealChatFeed({
    messages,
    session,
    isStreaming,
    error,
    messagesRemaining,
    voiceEnabled,
    proPlan,
    onRetry,
    onStop,
}: RealChatFeedProps) {
    const { t } = useTranslation("chat");
    const shouldReduceMotion = useReducedMotion();
    const bottomRef = useRef<HTMLDivElement>(null);

    // ARCHITECT: автоскролл ленты — это движение; при reduced motion прокрутка мгновенная (как в мок-ленте).
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
    }, [messages.length, isStreaming, shouldReduceMotion]);

    // ARCHITECT: новый поток снимает озвучку: прошлый ответ не должен читаться поверх нового.
    useEffect(() => {
        if (isStreaming) stopPlayback();
    }, [isStreaming]);

    return (
        <div
            className="flex-1 overflow-y-auto px-3 py-6 md:px-6"
            aria-live="polite"
            aria-busy={isStreaming}
        >
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message, index) => {
                    const next = messages[index + 1];
                    // ARCHITECT: подчёркивание реплики ученика выводится из карточек следующего ответа:
                    // разбор относится к этой фразе, отдельной связи между сообщениями нет.
                    const highlights =
                        message.role === "user"
                            ? (next?.cards?.corrections ?? []).map(
                                  (correction) => correction.fragment
                              )
                            : [];
                    // ARCHITECT: у незавершённого ответа кнопки озвучки нет: текст ещё не полный.
                    const voice =
                        message.role === "assistant" &&
                        message.voiceId !== null &&
                        !(isStreaming && index === messages.length - 1)
                            ? {
                                  messageId: message.id,
                                  text: message.content,
                                  voiceId: message.voiceId,
                                  enabled: voiceEnabled,
                                  proPlan,
                              }
                            : undefined;

                    return (
                        <div key={message.id} className="flex flex-col gap-3">
                            <MessageBubble
                                message={toBubbleMessage(message, session.id)}
                                session={session}
                                highlights={highlights}
                                voice={voice}
                            />

                            {message.cards !== null && (
                                <div className="flex flex-col gap-3 pl-11">
                                    <CorrectionsRow corrections={message.cards.corrections} />
                                    <QuizRow quiz={message.cards.quiz} />
                                    <VocabRow word={message.cards.vocabWord} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {isStreaming && (
                    <div className="flex items-center gap-3 pl-11">
                        <p className="text-xs text-[#f0f0f5]/40">{t("feed.typing")}</p>
                        <button type="button" onClick={onStop} className={RETRY_BUTTON}>
                            {t("feed.stop")}
                        </button>
                    </div>
                )}

                {error !== null && (
                    <div className="flex flex-col items-start gap-2 pl-11">
                        <p className="text-xs text-[#f0f0f5]/50">
                            {error === "limit" ? t("feed.limit") : t("feed.error")}
                        </p>
                        <button type="button" onClick={onRetry} className={RETRY_BUTTON}>
                            {t("feed.retry")}
                        </button>
                    </div>
                )}

                {messagesRemaining !== null && (
                    <p className="text-right text-[11px] tabular-nums text-[#f0f0f5]/30">
                        {t("feed.remaining", { count: messagesRemaining })}
                    </p>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
