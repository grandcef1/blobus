// ARCHITECT: мастер настройки — пошаговый флоу. Постоянные слои (фон, шторка, прогресс) живут
// в OnboardingShell: монтируются один раз за сессию и не перемонтируются при смене шага.
// ARCHITECT: у мастера два режима: полный (welcome, auth, репетитор, режим, расписание) и
// session — только репетитор и режим перед новой сессией. В режиме session финал создаёт сессию
// и открывает чат; раньше финал делал window.location.href и терял сессию при перезагрузке.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { BlobatarId } from "@/types/blobatar";
import type { LearningMode, OnboardingData, OnboardingStep, SchedulePreference } from "@/types/onboarding";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { createSession } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { AuthStep } from "@/components/onboarding/steps/AuthStep";
import { RepetitorSelectionStep } from "@/components/onboarding/steps/RepetitorSelectionStep";
import { ModeSelectionStep } from "@/components/onboarding/steps/ModeSelectionStep";
import { ScheduleStep } from "@/components/onboarding/steps/ScheduleStep";

export type OnboardingFlow = "full" | "session";

interface OnboardingProps {
    flow?: OnboardingFlow;
}

const STEP_ORDERS: Record<OnboardingFlow, OnboardingStep[]> = {
    full: ["welcome", "auth", "blobatar-selection", "mode-selection", "schedule"],
    session: ["blobatar-selection", "mode-selection"],
};

export function Onboarding({ flow = "full" }: OnboardingProps) {
    const navigate = useNavigate();
    const stepOrder = STEP_ORDERS[flow];
    const [currentStep, setCurrentStep] = useState<OnboardingStep>(stepOrder[0]);
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        blobatarId: null,
        learningMode: null,
        englishLevel: null,
        schedule: null,
        completedSteps: [],
    });

    const currentStepIndex = stepOrder.indexOf(currentStep);
    const stepNumber = currentStepIndex + 1;
    const totalSteps = stepOrder.length;
    const progress = (stepNumber / totalSteps) * 100;
    const isWelcome = currentStep === "welcome";

    const updateData = (updates: Partial<OnboardingData>) => {
        setOnboardingData((previous) => ({ ...previous, ...updates }));
    };

    // ARCHITECT: в режиме session отдельного шага уровня нет, поэтому уровень цели берётся из
    // профиля — карточка сессии показывает уровень, а не пустое поле.
    // ARCHITECT: финал обоих флоу одинаков — создаём сессию и открываем её чат. Раньше полный
    // флоу делал navigate("/app") и пользователь попадал на экран без сессии. replace: true —
    // чтобы «Назад» из чата не возвращал в мастер.
    const startSession = () => {
        if (!onboardingData.blobatarId || !onboardingData.learningMode) {
            navigate("/app", { replace: true });
            return;
        }

        const session = createSession({
            repetitorId: onboardingData.blobatarId,
            learningMode: onboardingData.learningMode,
            targetLevel: onboardingData.englishLevel ?? MOCK_USER_PROGRESS.currentLevel,
        });

        navigate(`/app/chat/${session.id}`, { replace: true });
    };

    const handleNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < totalSteps) {
            setCurrentStep(stepOrder[nextIndex]);
            return;
        }

        startSession();
    };

    // ARCHITECT: «Назад» на первом шаге режима session выводит в раздел «Сессии»: экран без
    // выхода — тупик.
    const handleBack = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(stepOrder[prevIndex]);
            return;
        }

        if (flow === "session") navigate("/app/sessions");
    };

    const stepNav = { onNext: handleNext, onBack: handleBack, step: stepNumber, totalSteps };

    const renderStep = () => {
        switch (currentStep) {
            case "welcome":
                return <WelcomeStep onNext={handleNext} />;
            case "auth":
                return <AuthStep {...stepNav} />;
            case "blobatar-selection":
                return (
                    <RepetitorSelectionStep
                        {...stepNav}
                        selectedId={onboardingData.blobatarId}
                        onSelect={(id: BlobatarId) => updateData({ blobatarId: id })}
                    />
                );
            case "mode-selection":
                return (
                    <ModeSelectionStep
                        {...stepNav}
                        selectedMode={onboardingData.learningMode}
                        onSelect={(mode: LearningMode) => updateData({ learningMode: mode })}
                    />
                );
            case "schedule":
                return (
                    <ScheduleStep
                        {...stepNav}
                        schedule={onboardingData.schedule}
                        onUpdate={(schedule: SchedulePreference) => updateData({ schedule })}
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
