// ARCHITECT: прогресс по направлениям. Полоса — общий ProgressBar, поэтому ширина задаётся
// данными в одном месте, а градиент заменён плоской заливкой. Подписи строк усечены: длинное
// название направления не должно растягивать карточку.

import { ProgressBar } from "@/components/shared/ProgressBar";
import type { LearningMode } from "@/types/onboarding";
import type { UserProgress } from "@/types/progress";

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
        <section aria-labelledby="progress-section-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <h2 id="progress-section-title" className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                Прогресс по направлениям
            </h2>

            <div className="space-y-3">
                {modes.map(([modeId, modeData]) => (
                    <div key={modeId} className="rounded-xl bg-[#141416] p-4">
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-[#f0f0f5]/85">
                                {MODE_LABELS[modeId]}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-[#f0f0f5]/45">
                                {modeData.progress}%
                            </span>
                        </div>

                        <ProgressBar value={modeData.progress} />

                        <p className="mt-2.5 truncate text-xs text-[#f0f0f5]/35">
                            {modeData.completedLessons} уроков · {modeData.wordsLearned} слов
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
