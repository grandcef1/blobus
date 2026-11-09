// ARCHITECT: Диспатчер типов сообщений - рендерит нужный компонент по типу

import { motion } from 'framer-motion';
import type { EnhancedMessage } from '@/types/session';
import { MessageBubble } from './MessageBubble';
import { CorrectionCard } from './CorrectionCard';
import { QuizCard } from './QuizCard';
import { VocabularyCardMessage } from './VocabularyCardMessage';

interface MessageRendererProps {
    message: EnhancedMessage;
    isLast: boolean;
}

const messageVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
};

export function MessageRenderer({ message, isLast }: MessageRendererProps) {
    const renderContent = () => {
        switch (message.type) {
            case 'correction':
                return (
                    <CorrectionCard
                        message={message}
                        correction={message.metadata?.correction}
                    />
                );

            case 'quiz':
                return <QuizCard quiz={message.metadata?.quiz} />;

            case 'vocabulary-card':
                return <VocabularyCardMessage card={message.metadata?.vocabularyCard} />;

            case 'text':
            default:
                return <MessageBubble message={message} />;
        }
    };

    return (
        <motion.div
            variants={messageVariants}
            initial={isLast ? 'hidden' : 'visible'}
            animate="visible"
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            {renderContent()}
        </motion.div>
    );
}