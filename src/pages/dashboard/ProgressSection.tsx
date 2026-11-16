// ARCHITECT: прогресс по направлениям. Полоса — общий ProgressBar, поэтому ширина задаётся
// данными в одном месте, а градиент заменён плоской заливкой. Подписи строк усечены: длинное
// название направления не должно растягивать карточку.

import { useTranslation } from "react-i18next";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { LearningMode } from "@/types/onboarding";
import type { UserProgress } from "@/types/progress";

interface ProgressSectionProps {
    progress: UserProgress;
}

// ARCHITECT: карта режим→ключ вместо готовых подписей: t() вызывается в рендере, поэтому смена
// языка обновляет подписи без перемонтирования карточки.
const MODE_LABEL_KEYS = {
    interview: "modes.interview",
    speaking: "modes.speaking",
    grammar: "modes.grammar",
    general: "modes.general",
} as const satisfies Record<LearningMode, string>;

export function ProgressSection({ progress }: ProgressSectionProps) {
    const { t } = useTranslation("dashboard");
    const modes = Object.entries(progress.modeProgress) as [
        LearningMode,
        (typeof progress.modeProgress)[LearningMode],
    ][];

    return (
        <section aria-labelledby="progress-section-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <h2 id="progress-section-title" className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                {t("overview.progress.title")}
            </h2>

            <div className="space-y-3">
                {modes.map(([modeId, modeData]) => (
                    <div key={modeId} className="rounded-xl bg-[#141416] p-4">
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-[#f0f0f5]/85">
                                {t(MODE_LABEL_KEYS[modeId])}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-[#f0f0f5]/45">
                                {modeData.progress}%
                            </span>
                        </div>

                        <ProgressBar value={modeData.progress} />

                        <p className="mt-2.5 truncate text-xs text-[#f0f0f5]/35">
                            {t("overview.progress.lessonsWords", {
                                lessons: modeData.completedLessons,
                                words: modeData.wordsLearned,
                            })}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
