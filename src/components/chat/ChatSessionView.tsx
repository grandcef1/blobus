// ARCHITECT: мок-ветка чата: сессия читается из общего мок-хранилища, поэтому созданная в мастере сессия
// открывается сразу и без перезагрузки. Ветку выбирает страница по USE_MOCKS; лента, шапка и поле ввода —
// общие компоненты, поэтому оба вида чата выглядят одинаково.

import { useNavigate, useParams } from "react-router-dom";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatNotFound } from "@/components/chat/ChatNotFound";
import { ChatSkeleton } from "@/components/dashboard/skeletons/ChatSkeleton";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

export function ChatSessionView() {
    const { sessionId = "" } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const chat = useChat(sessionId);

    if (chat.kind !== "mock" || chat.isLoading) return <ChatSkeleton />;

    const session = chat.session;

    if (session === null) return <ChatNotFound />;

    return (
        <div className={cn("relative flex flex-col bg-black", CHAT_HEIGHT)}>
            {/* ARCHITECT: правки из меню шапки возвращаются хук-у: он владеет сессией, поэтому шапка и лента
                всегда показывают одно и то же. */}
            <ChatHeader
                session={session}
                onUpdated={chat.applySession}
                onDeleted={() => navigate("/app/sessions")}
            />
            <ChatMessages messages={session.messages} session={session} />
            <ChatInput onSend={chat.send} />
        </div>
    );
}
