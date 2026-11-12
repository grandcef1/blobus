// ARCHITECT: Диспатчер типов сообщений — передаёт session в рендереры
// для отрисовки блобатара у сообщений бота

import { motion } from "framer-motion";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { MessageBubble } from "./MessageBubble";
import { CorrectionCard } from "./CorrectionCard";
import { QuizCard } from "./QuizCard";
import { VocabularyCardMessage } from "./VocabularyCardMessage";

interface MessageRendererProps {
    message: EnhancedMessage;
    session: EnhancedChatSession;
    isLast: boolean;
    /** Верный ответ в викторине: сигнал уходит на страницу чата, которая рисует конфетти. */
    onQuizCorrect?: () => void;
}

const messageVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
};

export function MessageRenderer({ message, session, isLast, onQuizCorrect }: MessageRendererProps) {
    const renderContent = () => {
        switch (message.type) {
            case "correction":
                return <CorrectionCard message={message} correction={message.metadata?.correction} session={session} />;
            case "quiz":
                return (
                    <QuizCard
                        quiz={message.metadata?.quiz}
                        session={session}
                        onCorrect={onQuizCorrect}
                    />
                );
            case "vocabulary-card":
                return <VocabularyCardMessage card={message.metadata?.vocabularyCard} session={session} />;
            case "text":
            default:
                return <MessageBubble message={message} session={session} />;
        }
    };

    return (
        <motion.div
            variants={messageVariants}
            initial={isLast ? "hidden" : "visible"}
            animate="visible"
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            {renderContent()}
        </motion.div>
    );
}