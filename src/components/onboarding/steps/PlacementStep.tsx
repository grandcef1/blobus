// ARCHITECT: шаг «Тест» мастера — разметка фаз: интро, вопросы, сводка. Состояние и правила переходов живут
// в usePlacementTest, поэтому здесь остаётся только выбор того, что показать: так шаг не разрастается при
// каждой правке логики теста.
// ARCHITECT: аудирования в мастере больше нет (C-0d3c): фиксированная форма из 30 вопросов его не содержит,
// а сама проверка осталась отдельным экраном /listening.

import { usePlacementTest } from "@/hooks/usePlacementTest";
import type { EnglishLevel } from "@/types/onboarding";
import { PlacementIntro } from "@/components/placement/PlacementIntro";
import { PlacementResultPhase } from "@/components/placement/PlacementResultPhase";
import { PlacementTestPhase } from "@/components/placement/PlacementTestPhase";

interface PlacementStepProps {
    onComplete: (level: EnglishLevel) => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

export function PlacementStep({ onComplete, onBack, step, totalSteps }: PlacementStepProps) {
    const test = usePlacementTest(onComplete);

    if (test.phase === "result" && test.savedResult !== null) {
        return (
            <PlacementResultPhase
                result={test.savedResult}
                step={step}
                totalSteps={totalSteps}
                onBack={onBack}
                onContinue={test.complete}
            />
        );
    }

    if (test.phase === "questions" && test.item !== null) {
        return (
            <PlacementTestPhase
                item={test.item}
                number={test.questionNumber}
                total={test.total}
                selectedOptionId={test.selectedOptionId}
                onSelect={test.answer}
                onBack={test.back}
                onNext={test.advance}
                step={step}
                totalSteps={totalSteps}
            />
        );
    }

    return (
        <PlacementIntro
            hasProgress={test.hasProgress}
            onStart={test.startOrResume}
            onBack={onBack}
            step={step}
            totalSteps={totalSteps}
        />
    );
}
