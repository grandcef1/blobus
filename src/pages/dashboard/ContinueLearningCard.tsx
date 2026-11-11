import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import { getBlobatarById } from "@/api/mocks/blobatars";
import type { EnhancedChatSession } from "@/types/session";
import type { UserProgress } from "@/types/progress";

interface ContinueLearningCardProps {
    session: EnhancedChatSession;
    progress: UserProgress;
}

export function ContinueLearningCard({ session, progress }: ContinueLearningCardProps) {
    const blobatar = getBlobatarById(session.repetitorId);

    return (
        <motion.a
            href={`/app/chat/${session.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="group flex items-center gap-5 rounded-2xl bg-[#d7d7df] p-6 transition-colors hover:bg-[#e0e0e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
            <div className="size-16 shrink-0 rounded-full bg-black/[0.08] p-1">
                {blobatar ? (
                    <Blobatar
                        animate="always"
                        name={blobatar.name.toLowerCase()}
                        traits={blobatar.traits}
                    />
                ) : (
                    <div className="size-full rounded-full bg-black/10" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-black/45">
                    Продолжить обучение
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-black">
                    {session.title}
                </p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-black/10">
                        <div
                            className="h-full rounded-full bg-black"
                            style={{ width: `${progress.overallProgress}%` }}
                        />
                    </div>
                    <span className="text-sm tabular-nums text-black/50">
                        {progress.overallProgress}%
                    </span>
                </div>
            </div>

            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/[0.08] transition-colors group-hover:bg-black/[0.14]">
                <ArrowRight className="size-5 text-black" />
            </div>
        </motion.a>
    );
}