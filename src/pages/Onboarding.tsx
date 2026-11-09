// ARCHITECT: Мастер настройки - онбординг новых пользователей
// Пошаговый флоу: приветствие → авторизация → репетитор → режим → расписание

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OnboardingStep, OnboardingData, RepetitorId, LearningMode, SchedulePreference } from '@/types/onboarding';
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { AuthStep } from '@/components/onboarding/steps/AuthStep';
import { RepetitorSelectionStep } from '@/components/onboarding/steps/RepetitorSelectionStep';
import { ModeSelectionStep } from '@/components/onboarding/steps/ModeSelectionStep';
import { ScheduleStep } from '@/components/onboarding/steps/ScheduleStep';

const STEP_ORDER: OnboardingStep[] = [
    'welcome',
    'auth',
    'repetitor-selection',
    'mode-selection',
    'schedule',
];

export function Onboarding() {
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        repetitorId: null,
        learningMode: null,
        englishLevel: null,
        schedule: null,
        completedSteps: [],
    });

    const currentStepIndex = STEP_ORDER.indexOf(currentStep);
    const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

    const handleNext = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEP_ORDER.length) {
            setCurrentStep(STEP_ORDER[nextIndex]);
        } else {
            window.location.href = '/app';
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
            case 'welcome':
                return <WelcomeStep onNext={handleNext} />;
            case 'auth':
                return <AuthStep onNext={handleNext} />;
            case 'repetitor-selection':
                return (
                    <RepetitorSelectionStep
                        selectedId={onboardingData.repetitorId}
                        onSelect={(id: RepetitorId) => updateData({ repetitorId: id })}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 'mode-selection':
                return (
                    <ModeSelectionStep
                        selectedMode={onboardingData.learningMode}
                        onSelect={(mode: LearningMode) => updateData({ learningMode: mode })}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            case 'schedule':
                return (
                    <ScheduleStep
                        schedule={onboardingData.schedule}
                        onUpdate={(schedule: SchedulePreference) => updateData({ schedule })}
                        onNext={handleNext}
                        onBack={handleBack}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-black">
            {/* Прогресс-бар */}
            <div className="fixed left-0 top-0 z-50 h-1 w-full bg-white/5">
                <motion.div
                    className="h-full bg-[#f0f0f5]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            </div>

            <div className="flex flex-1 items-center justify-center px-6 py-16">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-4xl"
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}