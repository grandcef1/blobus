// ARCHITECT: блок продолжения обучения — инвертированная светлая карточка, часть узнаваемого
// вида дашборда, поэтому палитра карточки сохранена. Ссылка вместо href: переход внутри SPA
// без перезагрузки; entrance-анимация осталась на обёртке, чтобы анимация не спорила с Link.
// Полоса прогресса — общий ProgressBar в инвертированном тоне (на светлом фоне тёмная заливка).

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Blobatar } from "@blobatar/react";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";
import type { UserProgress } from "@/types/progress";

interface ContinueLearningCardProps {
    session: EnhancedChatSession;
    progress: UserProgress;
}

export function ContinueLearningCard({ session, progress }: ContinueLearningCardProps) {
    const blobatar = getBlobatarById(session.repetitorId);

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Link
                to={`/app/chat/${session.id}`}
                className={cn(
                    "group flex items-center gap-4 rounded-2xl bg-[#d7d7df] p-4 transition-colors hover:bg-[#e0e0e8] md:gap-5 md:p-5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                )}
            >
                <span className="size-14 shrink-0 overflow-hidden rounded-full bg-black/[0.08] md:size-16">
                    {blobatar ? (
                        <Blobatar animate="always" name={blobatar.name.toLowerCase()} traits={blobatar.traits} />
                    ) : (
                        <span className="block size-full rounded-full bg-black/10" />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-black/45">
                        Продолжить обучение
                    </p>
                    <p className="mt-1 truncate text-lg font-semibold text-black">{session.title}</p>
                    <div className="mt-3 flex items-center gap-3">
                        <ProgressBar value={progress.overallProgress} tone="inverted" className="w-40" />
                        <span className="shrink-0 text-sm tabular-nums text-black/50">
                            {progress.overallProgress}%
                        </span>
                    </div>
                </div>

                <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-black/[0.08] transition-colors group-hover:bg-black/[0.14] sm:flex">
                    <ArrowRight className="size-5 text-black" aria-hidden="true" />
                </span>
            </Link>
        </motion.div>
    );
}
