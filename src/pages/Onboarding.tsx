// ARCHITECT: мастер настройки — пошаговый флоу. Постоянные слои (фон, шторка, прогресс)
// переехали в OnboardingShell: монтируются один раз за сессию и не перемонтируются при
// смене шага. Шаги рендерят только свой контент, переходы анимирует AnimatePresence
// в режиме wait — 0.4 с, easeOut.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
    OnboardingStep,
    OnboardingData,
    LearningMode,
    SchedulePreference,
} from "@/types/onboarding";
import type { BlobatarId } from "@/types/blobatar";
import { cn } from "@/lib/utils";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { AuthStep } from "@/components/onboarding/steps/AuthStep";
import { RepetitorSelectionStep } from "@/components/onboarding/steps/RepetitorSelectionStep";
import { ModeSelectionStep } from "@/components/onboarding/steps/ModeSelectionStep";
import { ScheduleStep } from "@/components/onboarding/steps/ScheduleStep";

const STEP_ORDER: OnboardingStep[] = [
    "welcome",
    "auth",
    "blobatar-selection",
    "mode-selection",
    "schedule",
];

export function Onboarding() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        blobatarId: null,
        learningMode: null,
        englishLevel: null,
        schedule: null,
        completedSteps: [],
    });

    const currentStepIndex = STEP_ORDER.indexOf(currentStep);
    const totalSteps = STEP_ORDER.length;
    const stepNumber = currentStepIndex + 1;
    const progress = (stepNumber / totalSteps) * 100;
    const isWelcome = currentStep === "welcome";

    const handleNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEP_ORDER.length) {
            setCurrentStep(STEP_ORDER[nextIndex]);
        } else {
            window.location.href = "/app";
        }
    };

    const handleBack = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEP_ORDER[prevIndex]);
        }
    };

    const updateData = (updates: Partial<OnboardingData>) => {
        setOnboardingData((prev) => ({ ...prev, ...updates }));
    };

    const renderStep = () => {
        switch (currentStep) {
            case "welcome":
                return <WelcomeStep onNext={handleNext} />;
            case "auth":
                return (
                    <AuthStep
                        onNext={handleNext}
                        onBack={handleBack}
                        step={stepNumber}
                        totalSteps={totalSteps}
                    />
                );
            case "blobatar-selection":
                return (
                    <RepetitorSelectionStep
                        selectedId={onboardingData.blobatarId}
                        onSelect={(id: BlobatarId) => updateData({ blobatarId: id })}
                        onNext={handleNext}
                        onBack={handleBack}
                        step={stepNumber}
                        totalSteps={totalSteps}
                    />
                );
            case "mode-selection":
                return (
                    <ModeSelectionStep
                        selectedMode={onboardingData.learningMode}
                        onSelect={(mode: LearningMode) => updateData({ learningMode: mode })}
                        onNext={handleNext}
                        onBack={handleBack}
                        step={stepNumber}
                        totalSteps={totalSteps}
                    />
                );
            case "schedule":
                return (
                    <ScheduleStep
                        schedule={onboardingData.schedule}
                        onUpdate={(schedule: SchedulePreference) => updateData({ schedule })}
                        onNext={handleNext}
                        onBack={handleBack}
                        step={stepNumber}
                        totalSteps={totalSteps}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <OnboardingShell progress={progress}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn("w-full", !isWelcome && "mx-auto max-w-4xl px-6 py-16")}
                >
                    {renderStep()}
                </motion.div>
            </AnimatePresence>
        </OnboardingShell>
    );
}