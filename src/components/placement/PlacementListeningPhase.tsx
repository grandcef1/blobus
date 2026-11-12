// ARCHITECT: фаза аудирования внутри теста уровня — заголовок и общий поток. Вынесена из шага:
// разметка фазы не должна разрастаться вместе с оркестратором.

import type { EnglishLevel } from "@/types/onboarding";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { ListeningFlow } from "@/components/placement/ListeningFlow";

interface PlacementListeningPhaseProps {
    step: number;
    totalSteps: number;
    onComplete: (level: EnglishLevel) => void;
}

export function PlacementListeningPhase({
    step,
    totalSteps,
    onComplete,
}: PlacementListeningPhaseProps) {
    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.assessment}
                title="Аудирование"
                subtitle="Шесть заданий: два прослушивания на каждое."
                step={step}
                totalSteps={totalSteps}
            />

            <ListeningFlow onComplete={(outcome) => onComplete(outcome.level)} />
        </div>
    );
}