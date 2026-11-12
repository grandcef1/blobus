// ARCHITECT: соответствие «шаг мастера → компонент» вынесено из страницы: страница владеет
// состоянием и переходами, а диспатчер шагов читается отдельно и не разрастается с каждым шагом.
// ARCHITECT: набор шагов полного флоу и режима session обслуживается одним диспатчером, поэтому
// компоненты шагов не знают ни про маршруты, ни про хранилище.

import type { BlobatarId } from "@/types/blobatar";
import type {
    EnglishLevel,
    LearningMode,
    OnboardingData,
    OnboardingStep,
    SchedulePreference,
} from "@/types/onboarding";
import { GoalsStep } from "./steps/GoalsStep";
import { IntroStep } from "./steps/IntroStep";
import { LessonStep } from "./steps/LessonStep";
import { ModeSelectionStep } from "./steps/ModeSelectionStep";
import { PlacementStep } from "./steps/PlacementStep";
import { RepetitorSelectionStep } from "./steps/RepetitorSelectionStep";
import { ScheduleStep } from "./steps/ScheduleStep";

interface OnboardingStepViewProps {
    step: OnboardingStep;
    data: OnboardingData;
    stepNumber: number;
    totalSteps: number;
    onNext: () => void;
    onBack: () => void;
    onUpdate: (updates: Partial<OnboardingData>) => void;
    onTestComplete: (level: EnglishLevel) => void;
}

export function OnboardingStepView({
    step,
    data,
    stepNumber,
    totalSteps,
    onNext,
    onBack,
    onUpdate,
    onTestComplete,
}: OnboardingStepViewProps) {
    const nav = { onNext, onBack, step: stepNumber, totalSteps };

    switch (step) {
        case "intro":
            return <IntroStep onNext={onNext} step={stepNumber} totalSteps={totalSteps} />;
        case "assessment":
            return (
                <PlacementStep
                    onComplete={onTestComplete}
                    onBack={onBack}
                    step={stepNumber}
                    totalSteps={totalSteps}
                />
            );
        case "goals":
            return (
                <GoalsStep
                    selectedMode={data.learningMode}
                    selectedId={data.blobatarId}
                    onSelectMode={(mode: LearningMode) => onUpdate({ learningMode: mode })}
                    onSelectBlobatar={(id: BlobatarId) => onUpdate({ blobatarId: id })}
                    onNext={onNext}
                    onBack={onBack}
                    step={stepNumber}
                    totalSteps={totalSteps}
                />
            );
        case "schedule":
            return (
                <ScheduleStep
                    {...nav}
                    schedule={data.schedule}
                    onUpdate={(schedule: SchedulePreference) => onUpdate({ schedule })}
                />
            );
        case "lesson":
            return (
                <LessonStep
                    data={data}
                    onNext={onNext}
                    onBack={onBack}
                    step={stepNumber}
                    totalSteps={totalSteps}
                />
            );
        case "blobatar-selection":
            return (
                <RepetitorSelectionStep
                    {...nav}
                    selectedId={data.blobatarId}
                    onSelect={(id: BlobatarId) => onUpdate({ blobatarId: id })}
                />
            );
        case "mode-selection":
            return (
                <ModeSelectionStep
                    {...nav}
                    selectedMode={data.learningMode}
                    onSelect={(mode: LearningMode) => onUpdate({ learningMode: mode })}
                />
            );
        default:
            return null;
    }
}