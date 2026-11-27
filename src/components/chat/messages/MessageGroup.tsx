// ARCHITECT: группа реплик одного отправителя: первая несёт аватар и имя, остальные только место под них,
// поэтому столбец текста не прыгает; время стоит под последней репликой группы (§спец. 1).
// ARCHITECT: сборка групп и углы пузыря живут отдельными модулями (grouping.ts, messageShape.ts): файл
// компонента экспортирует только компоненты (react-refresh/only-export-components).

import { useTranslation } from "react-i18next";
import type { ChatFeedMessage } from "@/hooks/useChat";
import type { EnglishLevel } from "@/types/onboarding";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { LessonWrapBlock } from "../LessonWrapBlock";
import { CorrectionsRow } from "./CorrectionsRow";
import type { ChatGroup, ChatGroupEntry } from "./grouping";
import { MessageBubble } from "./MessageBubble";
import { QuizRow } from "./QuizRow";
import { VocabRow } from "./VocabRow";

/** Время группы: под последней репликой, часы и минуты в языке интерфейса. */
function GroupTime({ at }: { readonly at: number }) {
    const { i18n } = useTranslation("chat");
    const label = new Intl.DateTimeFormat(i18n.language, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(at));

    return (
        <time
            dateTime={new Date(at).toISOString()}
            className="text-[11px] tabular-nums text-[#f0f0f5]/30"
        >
            {label}
        </time>
    );
}

/** Разделитель даты: новый день ломает группу и подписывается словом дня. */
export function ChatDateDivider({ at }: { readonly at: number }) {
    const { t, i18n } = useTranslation("chat");
    const label = new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "long",
    }).format(new Date(at));

    return (
        <p className="mx-auto rounded-full border border-white/5 px-3 py-1 text-[11px] text-[#f0f0f5]/40">
            <span className="sr-only">{t("feed.dateLabel")}: </span>
            {label}
        </p>
    );
}

const NO_TEXT: readonly string[] = [];

// ARCHITECT: карточки рисуются отдельными блоками, поэтому у сообщения всегда тип "text": legacy-ветки
// MessageRenderer сработали бы на неполных метаданных.
function toBubbleMessage(message: ChatFeedMessage, sessionId: string): EnhancedMessage {
    return {
        id: message.id,
        sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt,
        type: "text",
    };
}

// ARCHITECT: ошибки и мелкие правки разделяются здесь, а не в MessageBubble: у них разная подача — карточка
// правила с подчёркиванием против строки исправленного варианта.
function fragmentsOf(
    corrections: readonly { readonly kind: string; readonly fragment: string }[],
    kind: "error" | "polish"
): string[] {
    return corrections
        .filter((correction) => correction.kind === kind)
        .map((correction) => correction.fragment);
}

interface GroupEntryProps {
    readonly entry: ChatGroupEntry;
    readonly session: EnhancedChatSession;
    readonly level: EnglishLevel | null;
    readonly voiceEnabled: boolean;
    readonly proPlan: boolean;
    readonly animate: boolean;
    readonly streaming: boolean;
    readonly isLast: boolean;
    readonly onQuizAnswered: (answer: string) => void;
}

/** Одна реплика группы: пузырь, карточки ответа, блок слов итогового хода и время у последней. */
function GroupEntry({
    entry,
    session,
    level,
    voiceEnabled,
    proPlan,
    animate,
    streaming,
    isLast,
    onQuizAnswered,
}: GroupEntryProps) {
    const { message, prev, next, position } = entry;
    const corrections = next?.cards?.corrections ?? [];
    const isUser = message.role === "user";
    const polish = isUser
        ? corrections.filter((correction) => correction.kind === "polish").map((c) => c.rule)
        : NO_TEXT;
    const voice =
        message.role === "assistant" && message.voiceId !== null && !streaming
            ? {
                  messageId: message.id,
                  text: message.content,
                  voiceId: message.voiceId,
                  enabled: voiceEnabled,
                  proPlan,
                  // ARCHITECT: автозапуск только у ответа этой сессии и только когда ответ готов целиком.
                  autoPlay: animate,
              }
            : undefined;

    return (
        <div className="flex flex-col gap-3">
            <MessageBubble
                message={toBubbleMessage(message, session.id)}
                session={session}
                position={position}
                highlights={isUser ? fragmentsOf(corrections, "error") : NO_TEXT}
                polish={polish}
                voice={voice}
                animate={animate}
            />

            {message.cards !== null && (
                <div className="flex flex-col gap-3 pl-11">
                    <CorrectionsRow
                        corrections={message.cards.corrections.filter(
                            (correction) => correction.kind === "error"
                        )}
                        // ARCHITECT: разбор показывает пару «как было — как верно», поэтому карточке нужна
                        // реплика ученика: она стоит прямо над ответом репетитора.
                        source={prev?.content ?? null}
                        level={level}
                    />
                    <QuizRow quiz={message.cards.quiz} onAnswer={onQuizAnswered} />
                    <VocabRow word={message.cards.vocabWord} />
                </div>
            )}

            {!isUser && message.words.length > 0 && (
                <div className="pl-11">
                    <LessonWrapBlock words={message.words} />
                </div>
            )}

            {isLast && (
                <div className={isUser ? "flex justify-end" : "flex pl-11"}>
                    <GroupTime at={message.createdAt} />
                </div>
            )}
        </div>
    );
}

interface MessageGroupProps {
    readonly group: ChatGroup;
    readonly session: EnhancedChatSession;
    readonly level: EnglishLevel | null;
    readonly voiceEnabled: boolean;
    readonly proPlan: boolean;
    /** Печатать и озвучивать последнюю реплику ленты: она пришла в этой сессии. */
    readonly animateLast: boolean;
    /** Последняя реплика ленты ещё печатается: кнопки озвучки у неё нет. */
    readonly streamingLast: boolean;
    readonly onQuizAnswered: (answer: string) => void;
}

/** Группа реплик одного отправителя: внутри группы тесно, между группами лента даёт паузу. */
export function MessageGroup({
    group,
    session,
    level,
    voiceEnabled,
    proPlan,
    animateLast,
    streamingLast,
    onQuizAnswered,
}: MessageGroupProps) {
    const lastIndex = group.entries.length - 1;

    return (
        <div className="flex flex-col gap-1">
            {group.entries.map((entry, index) => (
                <GroupEntry
                    key={entry.message.id}
                    entry={entry}
                    session={session}
                    level={level}
                    voiceEnabled={voiceEnabled}
                    proPlan={proPlan}
                    animate={animateLast && index === lastIndex && entry.message.live}
                    streaming={streamingLast && index === lastIndex}
                    isLast={index === lastIndex}
                    onQuizAnswered={onQuizAnswered}
                />
            ))}
        </div>
    );
}
