// ARCHITECT: сессия читается из общего хранилища (api/sessions), поэтому сессия, созданная в
// мастере, открывается сразу и без перезагрузки. Высота — dvh минус мобильная шапка h-14
// (3.5rem): с полным dvh поле ввода уезжало бы под сгиб на телефоне. С md шапки нет, и высота
// снова равна вьюпорту. Отправка вынесена в api/chat, состояние подтягивается из хранилища,
// поэтому своя реплика сразу видна в ленте.
// ARCHITECT: загрузка идёт через useMockQuery, а локальные правки (отправка, настройки шапки)
// лежат отдельной заплатой с id сессии — страница остаётся владельцем того, что показывает.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sendMessage } from "@/api/chat";
import { fetchSessionById } from "@/api/sessions";
import { useMockQuery } from "@/hooks/useMockQuery";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatSkeleton } from "@/components/dashboard/skeletons/ChatSkeleton";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

interface SessionPatch {
    id: string;
    session: EnhancedChatSession;
}

export function ChatPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { data: loadedSession, isLoading } = useMockQuery(
        () => fetchSessionById(sessionId ?? ""),
        [sessionId]
    );
    const [patch, setPatch] = useState<SessionPatch | null>(null);

    if (isLoading) return <ChatSkeleton />;

    // ARCHITECT: заплата действует только для своей сессии: после перехода на другую id не
    // совпадает, и показывается то, что пришло из хранилища.
    const session = patch !== null && patch.id === sessionId ? patch.session : loadedSession;

    const handleSend = (text: string): void => {
        if (!sessionId) return;

        const updated = sendMessage(sessionId, text);
        if (updated) setPatch({ id: sessionId, session: updated });
    };

    // ARCHITECT: правки из меню шапки возвращаются сюда: страница остаётся единственным владельцем
    // состояния сессии, поэтому шапка и лента всегда показывают одно и то же.
    const handleUpdated = (updated: EnhancedChatSession): void => {
        if (sessionId) setPatch({ id: sessionId, session: updated });
    };

    // ARCHITECT: удалённую сессию показывать нечем — уводим в список.
    const handleDeleted = (): void => {
        navigate("/app/sessions");
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
        <div className={cn("relative flex flex-col bg-black", CHAT_HEIGHT)}>
            <ChatHeader session={session} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            {/* ARCHITECT: поздравление с верным ответом рисует сама карточка викторины: страница его
                не знает, поэтому анимация не появляется при входе в чат и в чужих сессиях. */}
            <ChatMessages messages={session.messages} session={session} />
            <ChatInput onSend={handleSend} />
        </div>
    );
}
