// ARCHITECT: Контейнер сообщений — передаёт сессию в MessageRenderer,
// чтобы рендерить блобатара у сообщений бота. Отступы px-3 на телефоне вместо px-4: на 360px
// 16px с каждой стороны съедали ширину пузыря, а не украшали его.

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import { MessageRenderer } from "./messages/MessageRenderer";

interface ChatMessagesProps {
    messages: EnhancedMessage[];
    session: EnhancedChatSession;
}

export function ChatMessages({ messages, session }: ChatMessagesProps) {
    const shouldReduceMotion = useReducedMotion();
    const bottomRef = useRef<HTMLDivElement>(null);

    // ARCHITECT: автоскролл ленты — это движение; при reduced motion прокрутка мгновенная.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
    }, [messages.length, shouldReduceMotion]);

    return (
        <div className="flex-1 overflow-y-auto px-3 py-6 md:px-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message, index) => (
                    <MessageRenderer
                        key={message.id}
                        message={message}
                        session={session}
                        isLast={index === messages.length - 1}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
