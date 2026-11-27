// ARCHITECT: лента реального чата собирает реплики в группы (MessageGroup): карточки ответа идут под репликой
// репетитора, отступ pl-11 выравнивает их по тексту (аватар size-8 плюс gap-3).
// ARCHITECT: aria-live="polite" на постоянном контейнере объявляет растущий ответ: текст приходит дельтами,
// и без live-региона скринридер прочитал бы только кадр по уходу фокуса.
// ARCHITECT: пока ответ печатается, рядом с подписью встаёт кнопка остановки: прерванная генерация не
// сохраняется, а повтор доступен из той же ленты (server/routes/chat.ts возвращает резерв квоты, §16.7).

import { Fragment, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatErrorKind, ChatFeedMessage } from "@/hooks/useChat";
import type { ChatLessonPlan } from "@/api/chat";
import { stopPlayback } from "@/lib/speechPlayback";
import type { EnhancedChatSession } from "@/types/session";
import type { EnglishLevel } from "@/types/onboarding";
import { LessonGoalCard } from "./LessonGoalCard";
import { withDateDividers, groupMessages } from "./messages/grouping";
import { ChatDateDivider, MessageGroup } from "./messages/MessageGroup";
import { TypingIndicator } from "./TypingIndicator";

interface RealChatFeedProps {
    readonly messages: readonly ChatFeedMessage[];
    readonly session: EnhancedChatSession;
    /** План урока: карточка цели над лентой; null — плана нет (старая сессия или сервер без него). */
    readonly plan: ChatLessonPlan | null;
    /** История сессии в пути: лента показывает скелетон, а не пустой экран. */
    readonly isLoading: boolean;
    readonly isStreaming: boolean;
    /** Вторая часть хода в пути: индикатор набора встаёт в группу репетитора без аватара. */
    readonly isAwaitingFollowUp: boolean;
    readonly error: ChatErrorKind | null;
    readonly messagesRemaining: number | null;
    /** Настройка voiceEnabled: выключена — кнопки озвучки в ленте нет. */
    readonly voiceEnabled: boolean;
    /** Тариф из entitlements: pro озвучивает провайдер, остальные читают браузерным синтезом. */
    readonly proPlan: boolean;
    /** Уровень ученика: на A1-A2 под примерами правок показывается перевод. */
    readonly level: EnglishLevel | null;
    readonly onRetry: () => void;
    readonly onStop: () => void;
    /** Ответ на задание: id сообщения с карточкой и выбор ученика — их сверяет сервер. */
    readonly onQuizAnswered: (serverId: string, answer: string) => void;
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
    isAwaitingFollowUp,
    error,
    messagesRemaining,
    voiceEnabled,
    proPlan,
    level,
    onRetry,
    onStop,
    onQuizAnswered,
}: RealChatFeedProps) {
    const { t } = useTranslation("chat");
    const shouldReduceMotion = useReducedMotion();
    const bottomRef = useRef<HTMLDivElement>(null);
    // ARCHITECT: три точки показываются только до первого текста: с первым символом встаёт пузырь, и ожидание
    // заменяется печатью ответа (§3.8). Второй случай — пауза перед второй частью хода.
    const lastMessage = messages[messages.length - 1];
    const isAwaitingFirstText =
        lastMessage === undefined ||
        (lastMessage.role === "assistant" && lastMessage.content === "");
    const groups = withDateDividers(groupMessages(messages));
    // ARCHITECT: «возвращение» видно только у незавершённого урока из истории: как только ученик написал сам
    // (в ленте появилась живая реплика), подсказка уходит — урок уже идёт (§спец. 7).
    const isResuming =
        plan !== null &&
        !plan.completed &&
        messages.length > 0 &&
        messages.every((message) => !message.live);

    // ARCHITECT: автоскролл ленты — это движение; при reduced motion прокрутка мгновенная (как в мок-ленте).
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
    }, [messages.length, isStreaming, shouldReduceMotion]);

    // ARCHITECT: новый поток снимает озвучку: прошлый ответ не должен читаться поверх нового.
    useEffect(() => {
        if (isStreaming) stopPlayback();
    }, [isStreaming]);

    // ARCHITECT: прокрутка живёт только внутри ленты: min-h-0 не даёт флекс-строке вырасти по контенту, и
    // страница остаётся высотой в окно, а шапка и поле ввода стоят на месте (§спец. 1).
    return (
        <div
            className="min-h-0 flex-1 overflow-y-auto px-3 py-6 md:px-6"
            aria-live="polite"
            aria-busy={isStreaming}
        >
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {plan !== null && <LessonGoalCard plan={plan} />}
                {isResuming && <p className="text-xs text-[#f0f0f5]/40">{t("feed.resume")}</p>}
                {isLoading && messages.length === 0 && <FeedSkeleton />}

                {groups.map(({ group, at, showDate }, index) => (
                    <Fragment key={group.key}>
                        {showDate && <ChatDateDivider at={at} />}
                        <MessageGroup
                            group={group}
                            session={session}
                            level={level}
                            voiceEnabled={voiceEnabled}
                            proPlan={proPlan}
                            animateLast={index === groups.length - 1}
                            streamingLast={isStreaming && index === groups.length - 1}
                            onQuizAnswered={onQuizAnswered}
                        />
                    </Fragment>
                ))}

                {isStreaming && (
                    <div className="flex items-center gap-3 pl-11">
                        {(isAwaitingFirstText || isAwaitingFollowUp) && <TypingIndicator />}
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
