// ARCHITECT: шаг «Тест» мастера — разметка фаз: интро, вопросы, аудирование, сводка. Состояние и
// правила переходов живут в usePlacementTest, поэтому здесь остаётся только выбор того, что показать:
// так шаг не разрастается при каждой правке логики теста.

import { usePlacementTest } from "@/hooks/usePlacementTest";
import type { EnglishLevel } from "@/types/onboarding";
import { PlacementIntro } from "@/components/placement/PlacementIntro";
import { PlacementListeningPhase } from "@/components/placement/PlacementListeningPhase";
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

    // ARCHITECT: аудирование идёт сразу после основных вопросов, если его включили в описании теста:
    // полосу прогресса мастера здесь рисует OnboardingShell, как и на остальных шагах.
    if (test.phase === "listening") {
        return (
            <PlacementListeningPhase
                step={step}
                totalSteps={totalSteps}
                onComplete={test.finishListening}
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
                withListening={test.includeListening}
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
            withListening={test.includeListening}
            hasProgress={test.hasProgress}
            onToggleListening={test.toggleListening}
            onStart={test.startOrResume}
            onBack={onBack}
            step={step}
            totalSteps={totalSteps}
        />
    );
}