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
import type { SessionActions } from "./header/sessionActions";
import type { EnhancedChatSession } from "@/types/session";

interface ChatHeaderProps {
    session: EnhancedChatSession;
    /** Режим просмотра: только аватар, тема и подпись, без меню и прогресса. */
    readOnly?: boolean;
    /** Подпись под заголовком: у реальной сессии это режим — имя уже в самом заголовке. */
    subtitle?: string;
    /** Действия сессии: их выполняет страница. Не переданы — меню в шапке не показывается. */
    actions?: SessionActions;
    /** false — полосы прогресса нет: у реальной сессии прогресс не считается (в сводке его нет). */
    showProgress?: boolean;
}

export function ChatHeader({
    session,
    readOnly = false,
    subtitle,
    actions,
    showProgress = true,
}: ChatHeaderProps) {
    const repetitor = getBlobatarById(session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === session.learningMode);

    const { completedLessons, totalLessons } = session.progress;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const showMenus = !readOnly && actions !== undefined;
    const withProgress = !readOnly && showProgress;

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#0d0d0d] px-4 md:h-16 md:px-6"
        >
            <div className="flex min-w-0 items-center gap-3">
                <BlobatarAvatar id={session.repetitorId} className="size-8" />

                <div className="min-w-0">
                    <h1 className="truncate text-sm font-semibold text-[#f0f0f5]">
                        {session.title}
                    </h1>
                    <p className="truncate text-xs text-[#f0f0f5]/40">
                        {subtitle ?? `${repetitor?.name} · ${mode?.label}`}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {withProgress && (
                    <div className="hidden items-center gap-2 sm:flex">
                        <span className="text-[11px] tabular-nums text-[#f0f0f5]/40">
                            {completedLessons}/{totalLessons}
                        </span>
                        <ProgressBar value={percent} className="w-20" />
                    </div>
                )}

                {showMenus && <SessionSettingsMenu session={session} actions={actions} />}
                {showMenus && <SessionActionsMenu session={session} actions={actions} />}
            </div>
        </motion.header>
    );
}
