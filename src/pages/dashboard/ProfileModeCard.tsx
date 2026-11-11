// ARCHITECT: карточка направления в профиле. Сильные и слабые стороны — одна колонка на
// телефоне и две с sm: на 360px два узких столбца рвали слова. Полоса прогресса — общий
// ProgressBar, поэтому ширина больше не задаётся inline-стилем.

import { Blobatar } from "@blobatar/react";
import { MOCK_REPETITORS } from "@/api/mocks/repetitors";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { LearningMode } from "@/types/onboarding";
import type { UserProgress } from "@/types/progress";

interface ProfileModeCardProps {
    modeId: LearningMode;
    modeData: UserProgress["modeProgress"][LearningMode];
}

const MODE_LABELS: Record<LearningMode, string> = {
    interview: "Собеседования",
    speaking: "Разговор",
    grammar: "Грамматика",
    general: "Общий",
};

const LIST_LIMIT = 2;

export function ProfileModeCard({ modeId, modeData }: ProfileModeCardProps) {
    const repetitor = MOCK_REPETITORS.find((item) => item.specialties.includes(modeId));
    const blobatar = repetitor ? getBlobatarById(repetitor.id) : undefined;

    return (
        <article className="rounded-xl bg-[#141416] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="size-7 shrink-0 overflow-hidden rounded-full bg-[#1a1a1c]">
                        {blobatar ? (
                            <Blobatar
                                animate="always"
                                name={blobatar.name.toLowerCase()}
                                traits={blobatar.traits}
                            />
                        ) : (
                            <span className="block size-7 rounded-full bg-white/10" />
                        )}
                    </span>
                    <h3 className="truncate text-sm font-medium text-[#f0f0f5]/85">{MODE_LABELS[modeId]}</h3>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-[#f0f0f5]/40">{modeData.level}</span>
            </div>

            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-xs text-[#f0f0f5]/40">
                    {modeData.completedLessons} уроков · {modeData.wordsLearned} слов
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[#f0f0f5]/50">{modeData.progress}%</span>
            </div>

            <ProgressBar value={modeData.progress} className="mb-3" />

            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-2">
                <div className="min-w-0">
                    <p className="text-[11px] text-[#f0f0f5]/35">Сильные стороны</p>
                    <ul className="mt-1 space-y-0.5">
                        {modeData.strengths.slice(0, LIST_LIMIT).map((strength) => (
                            <li key={strength} className="truncate text-[11px] text-[#f0f0f5]/55">
                                · {strength}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] text-[#f0f0f5]/35">Что улучшить</p>
                    <ul className="mt-1 space-y-0.5">
                        {modeData.weaknesses.slice(0, LIST_LIMIT).map((weakness) => (
                            <li key={weakness} className="truncate text-[11px] text-[#f0f0f5]/55">
                                · {weakness}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </article>
    );
}
