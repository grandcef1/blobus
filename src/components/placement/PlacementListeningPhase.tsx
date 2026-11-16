// ARCHITECT: фаза аудирования внутри теста уровня — заголовок шага и общий тест. Полосу прогресса
// мастера рисует OnboardingShell, поэтому тест её не знает и не дублирует.
// ARCHITECT: инструкция про два прослушивания показывается самим тестом — она одна на обоих входах,
// и мастер не повторяет её в подзаголовке шага.

import { useTranslation } from "react-i18next";
import type { EnglishLevel } from "@/types/onboarding";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { ListeningTest } from "@/components/placement/ListeningTest";

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
    const { t: tCommon } = useTranslation("common");

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.assessment)}
                title="Аудирование"
                subtitle="Шесть заданий на понимание на слух."
                step={step}
                totalSteps={totalSteps}
            />

            <ListeningTest context="wizard" onComplete={(result) => onComplete(result.level)} />
        </div>
    );
}