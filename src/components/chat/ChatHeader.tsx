// ARCHITECT: заголовок чата. Высота h-14 на телефоне и md:h-16 на широком экране: выше md есть
// место под вторую строку. Заголовок усечён (min-w-0 + truncate), иначе длинная тема выдавливает
// кнопки. Бейдж прогресса скрыт ниже sm и обесцвечен: на 360px он отнимал место у темы.
// ARCHITECT: шапка не мутирует сессию сама — обновление и удаление уходят наверх через onUpdated
// и onDeleted, поэтому состояние живёт в одном месте (ChatPage) и сайдбар видит те же данные.
// ARCHITECT: readOnly переводит шапку в режим просмотра — демо-окно лендинга показывает тот же
// заголовок, но без меню и прогресса: пример урока не должен выглядеть управляемым.

import { motion } from "framer-motion";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { SessionActionsMenu } from "./header/SessionActionsMenu";
import { SessionSettingsMenu } from "./header/SessionSettingsMenu";
import type { EnhancedChatSession } from "@/types/session";

interface ChatHeaderProps {
    session: EnhancedChatSession;
    /** Режим просмотра: только аватар, тема и подпись, без меню и прогресса. */
    readOnly?: boolean;
    onUpdated?: (session: EnhancedChatSession) => void;
    onDeleted?: () => void;
}

export function ChatHeader({ session, readOnly = false, onUpdated, onDeleted }: ChatHeaderProps) {
    const repetitor = getBlobatarById(session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === session.learningMode);

    const { completedLessons, totalLessons } = session.progress;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const showMenus = !readOnly && onUpdated !== undefined;

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#0d0d0d] px-4 md:h-16 md:px-6"
        >
            <div className="flex min-w-0 items-center gap-3">
                <BlobatarAvatar id={session.repetitorId} className="size-8" />

                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold text-[#f0f0f5]">{session.title}</h1>
                    <p className="truncate text-xs text-[#f0f0f5]/40">
                        {repetitor?.name} · {mode?.label}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {!readOnly && (
                    <div className="hidden items-center gap-2 sm:flex">
                        <span className="text-[11px] tabular-nums text-[#f0f0f5]/40">
                            {completedLessons}/{totalLessons}
                        </span>
                        <ProgressBar value={percent} className="w-20" />
                    </div>
                )}

                {showMenus && <SessionSettingsMenu session={session} onUpdated={onUpdated} />}
                {showMenus && onDeleted && (
                    <SessionActionsMenu
                        session={session}
                        onUpdated={onUpdated}
                        onDeleted={onDeleted}
                    />
                )}
            </div>
        </motion.header>
    );
}
