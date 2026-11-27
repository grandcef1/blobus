// ARCHITECT: одна запись ленты: пузырь сообщения и карточки ответа под ним. Вынесено отдельным компонентом,
// потому что лента отвечает за состояния потока (ожидание, ошибка, скелетон), а разметка записи — за реплику.
// Отступ pl-11 выравнивает карточки по тексту пузыря: аватар size-8 (2rem) плюс gap-3 (0.75rem).
// ARCHITECT: подчёркивание и мелкие правки реплики ученика выводятся из карточек следующего ответа: разбор
// относится к этой фразе, отдельной связи между сообщениями нет.

import type { ChatCorrection } from "@/api/chat";
import type { ChatFeedMessage } from "@/hooks/useChat";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { CorrectionsRow } from "./messages/CorrectionsRow";
import { MessageBubble } from "./messages/MessageBubble";
import { QuizRow } from "./messages/QuizRow";
import { VocabRow } from "./messages/VocabRow";

interface RealChatItemProps {
    readonly message: ChatFeedMessage;
    /** Следующая реплика: её карточки объясняют правки в этой. */
    readonly next: ChatFeedMessage | undefined;
    readonly session: EnhancedChatSession;
    readonly voiceEnabled: boolean;
    readonly proPlan: boolean;
    /** Печатать текст посимвольно: ответ пришёл в этой сессии, а не из истории. */
    readonly animate: boolean;
    /** Ответ ещё печатается: кнопки озвучки у него нет. */
    readonly streaming: boolean;
}

const NO_TEXT: readonly string[] = [];

// ARCHITECT: ошибки и мелкие правки разделяются здесь, а не в MessageBubble: у них разная подача — карточка
// правила с подчёркиванием против зелёной строки исправленного варианта.
function fragmentsOf(
    corrections: readonly ChatCorrection[],
    kind: ChatCorrection["kind"]
): string[] {
    return corrections
        .filter((correction) => correction.kind === kind)
        .map((correction) => correction.fragment);
}

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

export function RealChatItem({
    message,
    next,
    session,
    voiceEnabled,
    proPlan,
    animate,
    streaming,
}: RealChatItemProps) {
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
                  // ARCHITECT: автозапуск только у ответа текущей сессии и только когда ответ готов целиком.
                  autoPlay: animate,
              }
            : undefined;

    return (
        <div className="flex flex-col gap-3">
            <MessageBubble
                message={toBubbleMessage(message, session.id)}
                session={session}
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
                    />
                    <QuizRow quiz={message.cards.quiz} />
                    <VocabRow word={message.cards.vocabWord} />
                </div>
            )}
        </div>
    );
}
