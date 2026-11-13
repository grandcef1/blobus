// ARCHITECT: фаза вопроса внутри теста уровня — заголовок, вопрос и навигация. Вынесена из шага:
// оркестратор фаз держит только состояние, а разметка одной фазы живёт отдельно.
// ARCHITECT: подпись кнопки зависит от того, что идёт дальше — аудирование или итог.

import type { PlacementItem } from "@/types/placement";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { PlacementQuestion } from "@/components/placement/PlacementQuestion";

interface PlacementTestPhaseProps {
    item: PlacementItem;
    number: number;
    total: number;
    selectedOptionId: string | null;
    withListening: boolean;
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
    withListening,
    onSelect,
    onBack,
    onNext,
    step,
    totalSteps,
}: PlacementTestPhaseProps) {
    // ARCHITECT: последний вопрос — ровно двадцатый: граница сравнивается строго с общим числом
    // вопросов, той же величиной, что и счётчик «Вопрос N из total».
    const isLast = number === total;
    const lastLabel = withListening ? "К аудированию" : "К результатам";

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.assessment}
                title="Определим твой уровень"
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
                nextLabel={isLast ? lastLabel : "Дальше"}
                disabled={selectedOptionId === null}
            />
        </div>
    );
}