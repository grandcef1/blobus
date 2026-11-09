// ARCHITECT: Базовый пузырёк сообщения (текст)

import type { EnhancedMessage } from '@/types/session';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
    message: EnhancedMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                'flex',
                isUser ? 'justify-end' : 'justify-start'
            )}
        >
            <div
                className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[70%]',
                    isUser
                        ? 'bg-[#f0f0f5] text-black'
                        : 'border border-white/10 bg-white/[0.04] text-[#f0f0f5]'
                )}
            >
                <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
        </div>
    );
}