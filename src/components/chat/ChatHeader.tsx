// ARCHITECT: заголовок чата. Высота h-14 на телефоне и md:h-16 на широком экране: выше md есть
// место под вторую строку. Заголовок усечён (min-w-0 + truncate), иначе длинная тема выдавливает
// кнопки. Бейдж прогресса скрыт ниже sm и обесцвечен: на 360px он отнимал место у темы.
// Кнопки действий 44px на телефоне и 40px с md: шире палец, точнее мышь.

import { motion } from "framer-motion";
import { MoreVertical, Settings2 } from "lucide-react";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";

interface ChatHeaderProps {
    session: EnhancedChatSession;
}

const ICON_BUTTON =
    "flex size-11 items-center justify-center rounded-lg text-[#f0f0f5]/40 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:size-10";

export function ChatHeader({ session }: ChatHeaderProps) {
    const repetitor = getBlobatarById(session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === session.learningMode);

    const { completedLessons, totalLessons } = session.progress;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

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
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-[11px] tabular-nums text-[#f0f0f5]/40">
                        {completedLessons}/{totalLessons}
                    </span>
                    <ProgressBar value={percent} className="w-20" />
                </div>

                <button type="button" aria-label="Настройки сессии" className={cn(ICON_BUTTON)}>
                    <Settings2 className="size-4" aria-hidden="true" />
                </button>

                <button type="button" aria-label="Дополнительные действия" className={cn(ICON_BUTTON)}>
                    <MoreVertical className="size-4" aria-hidden="true" />
                </button>
            </div>
        </motion.header>
    );
}
