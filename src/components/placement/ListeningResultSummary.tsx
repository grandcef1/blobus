// ARCHITECT: сводка только про аудирование: у отложенной проверки нет ни грамматики, ни общего
// английского, поэтому показывать их было бы нечем — это дополнение к тесту уровня, а не его итог.
// ARCHITECT: вид повторяет сводку мастера, но усечён: тот же стеклянный блок, тот же порядок —
// уровень, объяснение, действие. Маршрут знает страница, поэтому компонент только сообщает о выходе.

import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { LEVEL_DESCRIPTIONS } from "@/lib/placement";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import type { EnglishLevel } from "@/types/onboarding";

interface ListeningResultSummaryProps {
    level: EnglishLevel;
    correctCount: number;
    total: number;
    onDone: () => void;
}

export function ListeningResultSummary({
    level,
    correctCount,
    total,
    onDone,
}: ListeningResultSummaryProps) {
    return (
        <StepCard className="flex flex-col gap-5">
            <h1 className="text-xl font-semibold text-[#f0f0f5]">Аудирование проверено</h1>

            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums text-[#f0f0f5]">{level}</span>
                <span className="text-sm text-[#f0f0f5]/50">уровень аудирования</span>
            </div>

            <p className="text-sm leading-[1.6] text-[#f0f0f5]/70">{LEVEL_DESCRIPTIONS[level]}</p>

            <p className="border-t border-white/5 pt-4 text-xs leading-[1.6] text-[#f0f0f5]/50">
                Верных ответов:{" "}
                <span className="tabular-nums text-[#f0f0f5]/80">{correctCount}</span> из {total}.
                Уровень сохранён в профиле и попадёт в следующую сессию.
            </p>

            <div className="flex justify-end">
                <Button type="button" className={PRIMARY_BUTTON} onClick={onDone}>
                    Вернуться в Обзор
                </Button>
            </div>
        </StepCard>
    );
}