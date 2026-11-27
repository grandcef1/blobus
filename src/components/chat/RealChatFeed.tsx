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
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatErrorKind, ChatFeedMessage } from "@/hooks/useChat";
import type { ChatLessonPlan } from "@/api/chat";
import { stopPlayback } from "@/lib/speechPlayback";
import type { EnhancedChatSession } from "@/types/session";
import { LessonGoalCard } from "./LessonGoalCard";
import { RealChatItem } from "./RealChatItem";
import { TypingIndicator } from "./TypingIndicator";

interface RealChatFeedProps {
    readonly messages: readonly ChatFeedMessage[];
    readonly session: EnhancedChatSession;
    /** План урока: карточка цели над лентой; null — плана нет (старая сессия или сервер без него). */
    readonly plan: ChatLessonPlan | null;
    /** История сессии в пути: лента показывает скелетон, а не пустой экран. */
    readonly isLoading: boolean;
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
// ARCHITECT: скелетон повторяет раскладку ленты: слева и справа, разной ширины, поэтому после загрузки
// сообщения не переставляются.
const SKELETON_ROWS = [
    { id: 0, side: "left", width: "w-64" },
    { id: 1, side: "right", width: "w-44" },
    { id: 2, side: "left", width: "w-72" },
] as const;

/** Ожидание истории: полосы ленты вместо пустого чёрного экрана. */
function FeedSkeleton() {
    return (
        <div className="flex flex-col gap-5" aria-busy="true">
            {SKELETON_ROWS.map((row) => (
                <div
                    key={row.id}
                    className={row.side === "right" ? "flex justify-end" : "flex items-start gap-3"}
                >
                    {row.side === "left" && <Skeleton className="size-8 shrink-0 rounded-2xl" />}
                    <Skeleton className={`h-16 ${row.width} rounded-2xl`} />
                </div>
            ))}
        </div>
    );
}

export function RealChatFeed({
    messages,
    session,
    plan,
    isLoading,
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
    // ARCHITECT: три точки показываются только до первого текста: с первым символом встаёт пузырь, и ожидание
    // заменяется печатью ответа (§3.8).
    const lastMessage = messages[messages.length - 1];
    const isAwaitingFirstText =
        lastMessage === undefined ||
        (lastMessage.role === "assistant" && lastMessage.content === "");

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
                {plan !== null && <LessonGoalCard plan={plan} />}
                {isLoading && messages.length === 0 && <FeedSkeleton />}
                {messages.map((message, index) => {
                    // ARCHITECT: пустого пузыря нет: ожидание первого текста рисует индикатор ниже.
                    if (message.role === "assistant" && message.content === "") return null;

                    const next = messages[index + 1];
                    const isLast = index === messages.length - 1;

                    return (
                        <RealChatItem
                            key={message.id}
                            message={message}
                            next={next}
                            session={session}
                            voiceEnabled={voiceEnabled}
                            proPlan={proPlan}
                            // ARCHITECT: печать и автозапуск голоса — только у реплики этой сессии: история
                            // показывается целиком и молча.
                            animate={isLast && message.live}
                            streaming={isStreaming && isLast}
                        />
                    );
                })}

                {isStreaming && (
                    <div className="flex items-center gap-3 pl-11">
                        {isAwaitingFirstText && <TypingIndicator />}
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
