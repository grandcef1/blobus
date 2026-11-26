// ARCHITECT: фаза итога теста — заголовок, сводка и переход дальше. Вынесена из шага: он стал
// оркестратором четырёх фаз и упёрся в лимит строк на компонент.
// ARCHITECT: экран показывает только серверный результат: вход в аудирование отсюда убран (C-0d3d) —
// проверка осталась отдельным экраном /listening, куда ведёт карточка «Обзора».

import { useTranslation } from "react-i18next";
import type { PlacementResultDto } from "@/types/placement";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { PlacementResultView } from "@/components/placement/PlacementResult";

interface PlacementResultPhaseProps {
    result: PlacementResultDto;
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

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.assessment)}
                title={t("result.title")}
                subtitle={t("result.subtitle")}
                step={step}
                totalSteps={totalSteps}
            />

            <PlacementResultView result={result} />

            <StepNav onBack={onBack} onNext={onContinue} nextLabel={t("shell.continue")} />
        </div>
    );
}
