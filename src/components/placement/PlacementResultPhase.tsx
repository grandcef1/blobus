// ARCHITECT: фаза итога теста — заголовок, сводка и переход дальше. Вынесена из шага: он стал
// оркестратором четырёх фаз и упёрся в лимит строк на компонент.
// ARCHITECT: аудирование открывается экраном /listening в интерфейсе мастера (без полосы прогресса):
// у проверки есть адрес, и вернуться к ней можно из истории браузера.

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { PlacementResult } from "@/types/placement";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";
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
    const { t } = useTranslation("placement");
    const { t: tCommon } = useTranslation("common");
    const navigate = useNavigate();

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.assessment)}
                title={t("result.title")}
                subtitle={t("result.subtitle")}
                step={step}
                totalSteps={totalSteps}
            />

            <PlacementResultView
                result={result}
                onCheckListening={() => navigate("/listening")}
            />

            <StepNav onBack={onBack} onNext={onContinue} nextLabel={t("shell.continue")} />
        </div>
    );
}