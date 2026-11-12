// ARCHITECT: мастер настройки — пять шагов, у каждого один номер: «Знакомство» (приветствие и
// аккаунт), «Тест», «Цели» (цель и репетитор), «Расписание», «Урок» (сводка и старт). Фазы внутри
// шага — деталь реализации, поэтому наружу виден один номер и подписи совпадают с лендингом.
// ARCHITECT: постоянные слои (фон, шторка, прогресс) живут в OnboardingShell: монтируются один раз
// за сессию и не перемонтируются при смене шага.
// ARCHITECT: у мастера два режима: полный (пять шагов) и session — только репетитор и режим перед
// новой сессией. Финал обоих флоу создаёт сессию и открывает чат; уровня из теста в режиме session
// нет, поэтому там берётся текущий уровень профиля.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { EnglishLevel, OnboardingData, OnboardingStep } from "@/types/onboarding";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { createSession } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { OnboardingStepView } from "@/components/onboarding/OnboardingStepView";

export type OnboardingFlow = "full" | "session";

interface OnboardingProps {
    flow?: OnboardingFlow;
}

const STEP_ORDERS: Record<OnboardingFlow, OnboardingStep[]> = {
    full: ["intro", "assessment", "goals", "schedule", "lesson"],
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
    // ARCHITECT: на фазе приветствия шаг занимает весь экран, поэтому общий контейнер с отступами
    // ему не подходит: форму аккаунта центрирует сам IntroStep.
    const isFullBleed = currentStep === "intro";

    const updateData = (updates: Partial<OnboardingData>) => {
        setOnboardingData((previous) => ({ ...previous, ...updates }));
    };

    // ARCHITECT: финал обоих флоу одинаков — создаём сессию и открываем её чат. Уровень берётся из
    // теста; в режиме session теста нет, поэтому там уровень профиля. replace: true — чтобы
    // «Назад» из чата не возвращал в мастер.
    const startSession = () => {
        // ARCHITECT: на полном флоу цель и репетитор выбраны на шаге «Цели», поэтому сюда попадают
        // только подготовленные данные. Ветка осталась защитой для режима session и уводит в список
        // сессий: раньше она открывала /app без сессии, то есть пустой экран.
        if (!onboardingData.blobatarId || !onboardingData.learningMode) {
            navigate("/app/sessions", { replace: true });
            return;
        }

        const session = createSession({
            repetitorId: onboardingData.blobatarId,
            learningMode: onboardingData.learningMode,
            targetLevel: onboardingData.englishLevel ?? MOCK_USER_PROGRESS.currentLevel,
        });

        navigate(`/app/chat/${session.id}`, { replace: true });
    };

    // ARCHITECT: результат теста — единственный источник уровня: он попадает и в сводку урока, и в
    // целевую сложность созданной сессии.
    const handleTestComplete = (level: EnglishLevel) => {
        updateData({ englishLevel: level });
        handleNext();
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

    const stepView = (
        <OnboardingStepView
            step={currentStep}
            data={onboardingData}
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onUpdate={updateData}
            onTestComplete={handleTestComplete}
        />
    );

    return (
        <OnboardingShell progress={progress}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn("w-full", !isFullBleed && "mx-auto max-w-4xl px-6 py-16")}
                >
                    {stepView}
                </motion.div>
            </AnimatePresence>
        </OnboardingShell>
    );
}
