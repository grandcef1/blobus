// ARCHITECT: сессия читается из общего хранилища (api/sessions), поэтому сессия, созданная в
// мастере, открывается сразу и без перезагрузки. Высота — dvh минус мобильная шапка h-14
// (3.5rem): с полным dvh поле ввода уезжало бы под сгиб на телефоне. С md шапки нет, и высота
// снова равна вьюпорту. Отправка вынесена в api/chat, состояние подтягивается из хранилища,
// поэтому своя реплика сразу видна в ленте.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sendMessage } from "@/api/chat";
import { getSessionById } from "@/api/sessions";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { cn } from "@/lib/utils";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

export function ChatPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loadedSession, setLoadedSession] = useState(() => ({
        id: sessionId,
        session: getSessionById(sessionId ?? ""),
    }));

    // ARCHITECT: смена id в маршруте не перемонтирует страницу, поэтому сессия перечитывается на
    // рендере: эффект здесь дал бы кадр с сообщениями предыдущей сессии.
    if (loadedSession.id !== sessionId) {
        setLoadedSession({ id: sessionId, session: getSessionById(sessionId ?? "") });
    }

    const session = loadedSession.session;

    const handleSend = (text: string): void => {
        if (!sessionId) return;
        setLoadedSession({ id: sessionId, session: sendMessage(sessionId, text) });
    };

    // ARCHITECT: раньше неизвестный id открывал дашборд внутри чата. Теперь это короткое
    // состояние с выходом в раздел «Сессии»: понятно, что произошло, и куда идти дальше.
    if (!session) {
        return (
            <div className={cn("flex flex-col items-center justify-center gap-3 bg-black px-6 text-center", CHAT_HEIGHT)}>
                <p className="text-sm text-[#f0f0f5]/60">Сессия не найдена</p>
                <Link
                    to="/app/sessions"
                    className="text-sm text-[#f0f0f5] underline transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                >
                    Ко всем сессиям
                </Link>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col bg-black", CHAT_HEIGHT)}>
            <ChatHeader session={session} />
            <ChatMessages messages={session.messages} session={session} />
            <ChatInput onSend={handleSend} />
        </div>
    );
}
