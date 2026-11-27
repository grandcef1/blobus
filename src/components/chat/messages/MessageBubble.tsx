// ARCHITECT: Пузырёк сообщения — у сообщений бота блобатар слева и имя.
// ARCHITECT: ширина строки ограничена и долей пузыря, и мерой читаемости 70ch: на широком экране
// процент не срабатывает, и текст разъезжается на всю ленту. Контраст смягчён: тело сообщения —
// white/90 на #111113 / #141416, цветных бордеров нет.
// ARCHITECT: правка помечается ровно в том месте реплики ученика, где стоит фрагмент, а не всей строкой:
// ошибочный фрагмент идёт красным, исправленный вариант — зелёной строкой ниже, разбор правила — карточкой.

import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { VoiceButton } from "@/components/chat/VoiceButton";
import { useTypedText } from "@/hooks/useTypedText";
import { highlightFragments } from "@/lib/highlightFragments";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { bubbleShape } from "./messageShape";
import type { MessagePosition } from "./messageShape";

/** Озвучка реплики: undefined — кнопки нет (мок-лента, выключенная настройка, незавершённый ответ). */
interface MessageVoice {
    readonly messageId: string;
    readonly text: string;
    readonly voiceId: string | null;
    readonly enabled: boolean;
    readonly proPlan: boolean;
    /** Озвучка стартует сама: реплика только что пришла из потока, поэтому кнопка работает повтором. */
    readonly autoPlay?: boolean;
}

interface MessageBubbleProps {
    message: EnhancedMessage;
    session: EnhancedChatSession;
    /** Дословные фрагменты ошибок этого сообщения: в реплике ученика они помечаются красным. */
    highlights?: readonly string[];
    /** Исправленные варианты мелких правок (kind = polish): зелёная строка без карточки правила. */
    polish?: readonly string[];
    voice?: MessageVoice;
    /** Печатать текст посимвольно: так выглядит ответ, пришедший в этой сессии. */
    animate?: boolean;
    /** Место в группе: аватар и имя несёт только первая реплика, у остальных остаётся их колонка. */
    position?: MessagePosition;
}

const BODY_TEXT = "text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base";
const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";
// ARCHITECT: красный помечает место ошибки, но не заливает реплику: мягкий red-300 на #141416 держит
// контраст выше AA без неона, а подчёркивание оставляет видимым, какой именно участок строки неверен.
const MARKED_TEXT = "text-red-300 underline decoration-red-400/50 underline-offset-4";
// ARCHITECT: зелёный — состояние «исправлено»: тем же цветом помечен успех в тостах. У полировки
// (апостроф, регистр) красного нет вовсе: неверный вариант здесь не показывают, только замену.
const POLISH_TEXT = "text-xs leading-[1.6] text-emerald-300/80";
const POLISH_LABEL = "text-emerald-300/50";

export function MessageBubble({
    message,
    session,
    highlights = [],
    polish = [],
    voice,
    animate = false,
    position = "single",
}: MessageBubbleProps) {
    const { t } = useTranslation(["common", "chat"]);
    const isUser = message.role === "user";
    const repetitor = getBlobatarById(session.repetitorId);
    // ARCHITECT: печатается только ответ репетитора: реплики ученика и история показываются целиком.
    const visible = useTypedText(message.content, !isUser && animate);
    // ARCHITECT: имя звучит на каждой реплике группы: у первых его видно, у остальных оно есть только для
    // скринридера — иначе группа читалась бы как реплики без автора.
    const author = isUser ? t("chat:feed.you") : (repetitor?.name ?? "");
    const showAuthor = position === "first" || position === "single";

    if (isUser) {
        return (
            <div className="flex flex-col items-end gap-1.5">
                <div
                    className={cn(
                        "max-w-[min(80%,70ch)] bg-[#141416] px-4 py-3",
                        bubbleShape(position, "user"),
                        BODY_TEXT
                    )}
                >
                    <p className="whitespace-pre-wrap">
                        <span className="sr-only">{author}: </span>
                        {highlightFragments(message.content, highlights).map((segment, index) => (
                            <span key={index} className={segment.marked ? MARKED_TEXT : undefined}>
                                {segment.text}
                            </span>
                        ))}
                    </p>
                </div>

                {polish.length > 0 && (
                    <ul className="flex max-w-[min(80%,70ch)] flex-col items-end gap-1">
                        {polish.map((fixed, index) => (
                            <li key={index} className={POLISH_TEXT}>
                                <span className={POLISH_LABEL}>{t("correction.polish")}: </span>
                                {fixed}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            {showAuthor ? (
                <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            ) : (
                // ARCHITECT: место под аватар остаётся пустым: без него текст следующих реплик группы сдвинулся
                // бы влево и лента «прыгала» бы на каждом сообщении.
                <div className="mt-0.5 size-8 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
                {showAuthor && repetitor && (
                    <p className={AUTHOR_NAME} aria-hidden="true">
                        {repetitor.name}
                    </p>
                )}
                <div
                    className={cn(
                        "max-w-[min(85%,70ch)] bg-[#111113] px-4 py-3",
                        bubbleShape(position, "assistant"),
                        BODY_TEXT
                    )}
                >
                    <p className="whitespace-pre-wrap">
                        <span className="sr-only">{author}: </span>
                        {visible}
                    </p>

                    {voice !== undefined && <VoiceButton {...voice} />}
                </div>
            </div>
        </div>
    );
}
