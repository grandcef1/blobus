// ARCHITECT: шаг 1 «Знакомство» — оркестратор двух фаз: приветствие и аккаунт. Отдельного номера у
// фаз нет: для человека это один шаг, поэтому внутренние компоненты сохранены как есть.
// ARCHITECT: фаза аккаунта получает тот же контейнер, что остальные шаги мастера: приветствие
// занимает весь экран, а форма должна стоять по общей вертикали.

import { useState } from "react";
import { AuthStep } from "./AuthStep";
import { WelcomeStep } from "./WelcomeStep";

interface IntroStepProps {
    onNext: () => void;
    step: number;
    totalSteps: number;
}

type IntroPhase = "welcome" | "auth";

export function IntroStep({ onNext, step, totalSteps }: IntroStepProps) {
    const [phase, setPhase] = useState<IntroPhase>("welcome");

    if (phase === "welcome") {
        return <WelcomeStep onNext={() => setPhase("auth")} />;
    }

    // ARCHITECT: «Назад» на фазе аккаунта возвращает к приветствию, а не выводит из мастера:
    // внутри одного шага назад значит предыдущая фаза.
    return (
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
            <AuthStep
                onNext={onNext}
                onBack={() => setPhase("welcome")}
                step={step}
                totalSteps={totalSteps}
            />
        </div>
    );
}