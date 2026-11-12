// ARCHITECT: сессия читается из общего хранилища (api/sessions), поэтому сессия, созданная в
// мастере, открывается сразу и без перезагрузки. Высота — dvh минус мобильная шапка h-14
// (3.5rem): с полным dvh поле ввода уезжало бы под сгиб на телефоне. С md шапки нет, и высота
// снова равна вьюпорту. Отправка вынесена в api/chat, состояние подтягивается из хранилища,
// поэтому своя реплика сразу видна в ленте.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sendMessage } from "@/api/chat";
import { getSessionById } from "@/api/sessions";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

export function ChatPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [loadedSession, setLoadedSession] = useState(() => ({
        id: sessionId,
        session: getSessionById(sessionId ?? ""),
    }));
    // ARCHITECT: ключ поздравления растёт на каждый верный ответ: смена key перезапускает анимацию,
    // а сам оверлей живёт на уровне страницы и покрывает всю область чата, а не карточку.
    const [celebrationKey, setCelebrationKey] = useState(0);

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

    // ARCHITECT: правки из меню шапки возвращаются сюда: страница остаётся единственным владельцем
    // состояния сессии, поэтому шапка и лента всегда показывают одно и то же.
    const handleUpdated = (updated: EnhancedChatSession): void => {
        setLoadedSession({ id: sessionId, session: updated });
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
            <ChatMessages
                messages={session.messages}
                session={session}
                onQuizCorrect={() => setCelebrationKey((previous) => previous + 1)}
            />
            <ChatInput onSend={handleSend} />
            {/* ARCHITECT: key — единственный триггер показа: пока ключ нулевой, оверлея нет. */}
            {celebrationKey > 0 && <CorrectAnswerCelebration key={celebrationKey} />}
        </div>
    );
}
