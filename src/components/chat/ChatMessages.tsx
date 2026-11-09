// ARCHITECT: Контейнер списка сообщений с автопрокруткой

import { useEffect, useRef } from 'react';
import type { EnhancedMessage } from '@/types/session';
import { MessageRenderer } from './messages/MessageRenderer';

interface ChatMessagesProps {
    messages: EnhancedMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message, index) => (
                    <MessageRenderer
                        key={message.id}
                        message={message}
                        isLast={index === messages.length - 1}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}