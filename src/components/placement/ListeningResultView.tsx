// ARCHITECT: итог аудирования — уровень и число верных ответов. Оценка мок: реальная проверка
// понимания на слух и произношения нейросетью появится на бэкенде.

import { LEVEL_DESCRIPTIONS } from "@/lib/placement";
import type { EnglishLevel } from "@/types/onboarding";

interface ListeningResultViewProps {
    level: EnglishLevel;
    correctCount: number;
    total: number;
}

export function ListeningResultView({ level, correctCount, total }: ListeningResultViewProps) {
    return (
        <div className="mt-4">
            <p className="text-sm text-[#f0f0f5]/80">
                Уровень аудирования:{" "}
                <span className="tabular-nums text-[#f0f0f5]">{level}</span>
            </p>
            <p className="mt-2 text-xs leading-[1.6] text-[#f0f0f5]/50">
                {LEVEL_DESCRIPTIONS[level]} Верных ответов: {correctCount} из {total}.
            </p>
        </div>
    );
}