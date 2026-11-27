// ARCHITECT: мок-ветка чата: сессия читается из общего мок-хранилища, поэтому созданная в мастере сессия
// открывается сразу и без перезагрузки. Ветку выбирает страница по USE_MOCKS; лента, шапка и поле ввода —
// общие компоненты, поэтому оба вида чата выглядят одинаково.

import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    clearSessionMessages,
    deleteSession,
    resetSessionProgress,
    updateSession,
} from "@/api/sessions";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatNotFound } from "@/components/chat/ChatNotFound";
import { ChatSkeleton } from "@/components/dashboard/skeletons/ChatSkeleton";
import type { SessionActions } from "@/components/chat/header/sessionActions";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

export function ChatSessionView() {
    const { sessionId = "" } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation("chat");
    const chat = useChat(sessionId);

    if (chat.kind !== "mock" || chat.isLoading) return <ChatSkeleton />;

    const session = chat.session;

    if (session === null) return <ChatNotFound />;

    // ARCHITECT: мок-ветка пишет в мок-стор и обновляет сессию хука — шапка и лента показывают одно и то же.
    // Тосты тоже здесь: меню и диалоги остаются формой, а результат действия показывает страница.
    const actions: SessionActions = {
        rename: async (title) => {
            const updated = updateSession(session.id, { title });

            if (updated !== undefined) chat.applySession(updated);

            toast.success(t("rename.toast.saved"));
        },
        changeTutor: async (tutorId) => {
            const updated = updateSession(session.id, { repetitorId: tutorId });

            if (updated !== undefined) chat.applySession(updated);

            toast.info(t("settings.toast.tutorChanged"));
        },
        changeMode: async (mode) => {
            const updated = updateSession(session.id, { learningMode: mode });

            if (updated !== undefined) chat.applySession(updated);

            toast.info(t("settings.toast.modeChanged"));
        },
        resetProgress: async () => {
            const updated = resetSessionProgress(session.id);

            if (updated !== undefined) chat.applySession(updated);

            toast.success(t("settings.toast.progressReset"));
        },
        reset: async () => {
            const updated = clearSessionMessages(session.id);

            if (updated !== undefined) chat.applySession(updated);

            toast.success(t("actions.toast.historyCleared"));
        },
        remove: async () => {
            deleteSession(session.id);
            toast.success(t("actions.toast.sessionDeleted"));
            navigate("/app/sessions");
        },
    };

    return (
        <div className={cn("relative flex min-h-0 flex-col overflow-clip bg-black", CHAT_HEIGHT)}>
            {/* ARCHITECT: правки из меню шапки возвращаются хук-у: он владеет сессией, поэтому шапка и лента
                всегда показывают одно и то же. */}
            <ChatHeader session={session} actions={actions} />
            <ChatMessages messages={session.messages} session={session} />
            <ChatInput onSend={chat.send} />
        </div>
    );
}
