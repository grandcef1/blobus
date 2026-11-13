// ARCHITECT: фаза итога теста — заголовок, сводка и переход дальше. Вынесена из шага: он стал
// оркестратором четырёх фаз и упёрся в лимит строк на компонент.
// ARCHITECT: аудирование открывается отдельным экраном /app/listening (в приложении, без полосы
// мастера): у проверки есть адрес, и вернуться к ней можно из истории браузера.

import { useNavigate } from "react-router-dom";
import type { PlacementResult } from "@/types/placement";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { PlacementResultView } from "@/components/placement/PlacementResult";

interface PlacementResultPhaseProps {
    result: PlacementResult;
    step: number;
    totalSteps: number;
    onBack: () => void;
    onContinue: () => void;
}

export function PlacementResultPhase({
    result,
    step,
    totalSteps,
    onBack,
    onContinue,
}: PlacementResultPhaseProps) {
    const navigate = useNavigate();

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.assessment}
                title="Уровень определён"
                subtitle="Уровень попадёт в сводку перед первым уроком и в профиль."
                step={step}
                totalSteps={totalSteps}
            />

            <PlacementResultView
                result={result}
                onCheckListening={() => navigate("/app/listening")}
            />

            <StepNav onBack={onBack} onNext={onContinue} nextLabel="Продолжить" />
        </div>
    );
}