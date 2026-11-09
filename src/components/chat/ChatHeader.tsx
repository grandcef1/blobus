// ARCHITECT: Заголовок чат-сессии с информацией о репетиторе и режиме

import { motion } from 'framer-motion';
import { Settings2, MoreVertical, Flame } from 'lucide-react';
import type { EnhancedChatSession } from '@/types/session';
import { MOCK_REPETITORS } from '@/api/mocks/repetitors';
import { MOCK_LEARNING_MODES } from '@/api/mocks/repetitors';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
    session: EnhancedChatSession;
}

export function ChatHeader({ session }: ChatHeaderProps) {
    const repetitor = MOCK_REPETITORS.find((r) => r.id === session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((m) => m.id === session.learningMode);

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/80 px-6 backdrop-blur-sm"
        >
            {/* Left: Repetitor info */}
            <div className="flex items-center gap-3">
                <div
                    className="flex size-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${repetitor?.avatarColor ?? '#8B5CF6'}25` }}
                >
                    <div
                        className="size-5 rounded-full"
                        style={{ backgroundColor: repetitor?.avatarColor ?? '#8B5CF6' }}
                    />
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-semibold text-[#f0f0f5]">
                            {session.title}
                        </h1>
                        {session.progress.streakDays > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                                <Flame className="size-3" />
                                {session.progress.streakDays}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#f0f0f5]/40">
                        {repetitor?.name} · {mode?.label}
                        {session.targetLevel && ` · Level ${session.targetLevel}`}
                    </p>
                </div>
            </div>

            {/* Right: Progress + Actions */}
            <div className="flex items-center gap-3">
                {/* Mini progress bar */}
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-[11px] text-[#f0f0f5]/40">
                        Lesson {session.progress.completedLessons}/{session.progress.totalLessons}
                    </span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(session.progress.completedLessons / session.progress.totalLessons) * 100}%`,
                            }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                            className="h-full rounded-full bg-[#f0f0f5]"
                        />
                    </div>
                </div>

                <button
                    className={cn(
                        'flex size-8 items-center justify-center rounded-lg text-[#f0f0f5]/40',
                        'transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70'
                    )}
                >
                    <Settings2 className="size-4" />
                </button>

                <button
                    className={cn(
                        'flex size-8 items-center justify-center rounded-lg text-[#f0f0f5]/40',
                        'transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/70'
                    )}
                >
                    <MoreVertical className="size-4" />
                </button>
            </div>
        </motion.header>
    );
}