import { motion } from "framer-motion";
import type { UserProgress } from "@/types/progress";
import type { LearningMode } from "@/types/onboarding";

interface ProgressSectionProps {
    progress: UserProgress;
}

const MODE_LABELS: Record<LearningMode, string> = {
    interview: "Собеседования",
    speaking: "Разговор",
    grammar: "Грамматика",
    general: "Общий",
};

export function ProgressSection({ progress }: ProgressSectionProps) {
    const modes = Object.entries(progress.modeProgress) as [
        LearningMode,
        (typeof progress.modeProgress)[LearningMode],
    ][];

    return (
        <div className="rounded-2xl bg-[#111113] p-5">
            <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                Прогресс по направлениям
            </h2>
            <div className="space-y-3">
                {modes.map(([modeId, modeData]) => (
                    <div key={modeId} className="rounded-xl bg-[#141416] p-4">
                        <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-sm font-medium text-[#f0f0f5]/85">
                                {MODE_LABELS[modeId]}
                            </span>
                            <span className="text-sm tabular-nums text-[#f0f0f5]/45">
                                {modeData.progress}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1c]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${modeData.progress}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full bg-[#f0f0f5]/70"
                            />
                        </div>
                        <p className="mt-2.5 text-xs text-[#f0f0f5]/35">
                            {modeData.completedLessons} уроков · {modeData.wordsLearned} слов
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}