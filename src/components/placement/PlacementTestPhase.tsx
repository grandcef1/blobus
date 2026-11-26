// ARCHITECT: фаза вопроса внутри теста уровня — заголовок, вопрос и навигация. Вынесена из шага:
// оркестратор фаз держит только состояние, а разметка одной фазы живёт отдельно.
// ARCHITECT: подпись кнопки зависит от того, что идёт дальше — аудирование или итог.

import { useTranslation } from "react-i18next";
import type { PlacementItem } from "@/types/placement";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { PlacementQuestion } from "@/components/placement/PlacementQuestion";

interface PlacementTestPhaseProps {
    item: PlacementItem;
    number: number;
    total: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
    onBack: () => void;
    onNext: () => void;
    step: number;
    totalSteps: number;
}

export function PlacementTestPhase({
    item,
    number,
    total,
    selectedOptionId,
    onSelect,
    onBack,
    onNext,
    step,
    totalSteps,
}: PlacementTestPhaseProps) {
    const { t } = useTranslation("placement");
    const { t: tCommon } = useTranslation("common");
    // ARCHITECT: последний вопрос — тот, чей номер равен размеру банка: и граница, и счётчик «Вопрос N из
    // total» считаются от одной величины — total.
    const isLast = number === total;

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.assessment)}
                title={t("intro.title")}
                step={step}
                totalSteps={totalSteps}
            />

            <PlacementQuestion
                item={item}
                number={number}
                total={total}
                selectedOptionId={selectedOptionId}
                onSelect={onSelect}
            />

            <StepNav
                onBack={onBack}
                onNext={onNext}
                nextLabel={isLast ? t("test.toResults") : t("shell.next")}
                disabled={selectedOptionId === null}
            />
        </div>
    );
}
