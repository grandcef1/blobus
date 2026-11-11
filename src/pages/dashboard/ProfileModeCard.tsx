// ARCHITECT: Карточка режима в профиле — отдельный блок, монохромная палитра

import { motion } from "framer-motion";
import { Blobatar } from "@blobatar/react";
import { MOCK_REPETITORS } from "@/api/mocks/repetitors";
import { getBlobatarById } from "@/api/mocks/blobatars";
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

export function ProfileModeCard({ modeId, modeData }: ProfileModeCardProps) {
    const repetitor = MOCK_REPETITORS.find((r) => r.specialties.includes(modeId));
    const blobatar = repetitor ? getBlobatarById(repetitor.id) : undefined;

    return (
        <div className="rounded-xl bg-[#141416] p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="size-7 shrink-0 rounded-full bg-[#1a1a1c] p-0.5">
                        {blobatar ? (
                            <Blobatar
                                animate="always"
                                name={blobatar.name.toLowerCase()}
                                traits={blobatar.traits}
                            />
                        ) : (
                            <div className="size-full rounded-full bg-white/10" />
                        )}
                    </div>
                    <h3 className="text-sm font-medium text-[#f0f0f5]/85">
                        {MODE_LABELS[modeId]}
                    </h3>
                </div>
                <span className="text-xs tabular-nums text-[#f0f0f5]/40">
                    {modeData.level}
                </span>
            </div>

            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-[#f0f0f5]/40">
                    {modeData.completedLessons} уроков · {modeData.wordsLearned} слов
                </span>
                <span className="text-xs tabular-nums text-[#f0f0f5]/50">
                    {modeData.progress}%
                </span>
            </div>

            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#1a1a1c]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${modeData.progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-[#f0f0f5]/70"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                <div>
                    <p className="text-[11px] text-[#f0f0f5]/35">Сильные стороны</p>
                    <ul className="mt-1 space-y-0.5">
                        {modeData.strengths.slice(0, 2).map((strength) => (
                            <li key={strength} className="text-[11px] text-[#f0f0f5]/55">
                                · {strength}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="text-[11px] text-[#f0f0f5]/35">Что улучшить</p>
                    <ul className="mt-1 space-y-0.5">
                        {modeData.weaknesses.slice(0, 2).map((weakness) => (
                            <li key={weakness} className="text-[11px] text-[#f0f0f5]/55">
                                · {weakness}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}