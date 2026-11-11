// ARCHITECT: Заголовок чата — блобатар через getBlobatarById, монохромные цвета

import { motion } from "framer-motion";
import { Settings2, MoreVertical } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import type { EnhancedChatSession } from "@/types/session";
import { MOCK_REPETITORS, MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
    session: EnhancedChatSession;
}

export function ChatHeader({ session }: ChatHeaderProps) {
    const repetitor = MOCK_REPETITORS.find((r) => r.id === session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((m) => m.id === session.learningMode);
    const blobatar = getBlobatarById(session.repetitorId);

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#0d0d0d] px-4 md:px-6"
        >
            <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#141416] p-0.5">
                    {blobatar ? (
                        <Blobatar animate="always" name={blobatar.name.toLowerCase()} traits={blobatar.traits} />
                    ) : (
                        <div className="size-full rounded-full bg-white/10" />
                    )}
                </div>
                <div>
                    <h1 className="text-sm font-semibold text-[#f0f0f5]">{session.title}</h1>
                    <p className="text-xs text-[#f0f0f5]/40">
                        {repetitor?.name} · {mode?.label}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-[11px] tabular-nums text-[#f0f0f5]/40">
                        {session.progress.completedLessons}/{session.progress.totalLessons}
                    </span>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(session.progress.completedLessons / session.progress.totalLessons) * 100}%`,
                            }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full bg-[#f0f0f5]/60"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    aria-label="Настройки сессии"
                    className={cn(
                        "flex size-8 items-center justify-center rounded-lg text-[#f0f0f5]/40",
                        "transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70"
                    )}
                >
                    <Settings2 className="size-4" />
                </button>

                <button
                    type="button"
                    aria-label="Дополнительные действия"
                    className={cn(
                        "flex size-8 items-center justify-center rounded-lg text-[#f0f0f5]/40",
                        "transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70"
                    )}
                >
                    <MoreVertical className="size-4" />
                </button>
            </div>
        </motion.header>
    );
}