// ARCHITECT: шаг 1 «Знакомство» — оркестратор двух фаз: приветствие и аккаунт. Отдельного номера у
// фаз нет: для человека это один шаг, поэтому внутренние компоненты сохранены как есть.
// ARCHITECT: фаза аккаунта получает тот же контейнер, что остальные шаги мастера: приветствие
// занимает весь экран, а форма должна стоять по общей вертикали.

import { useState } from "react";
import { motion } from "framer-motion";
import { AuthStep } from "./AuthStep";
import { WelcomeStep } from "./WelcomeStep";

interface IntroStepProps {
    onNext: () => void;
    step: number;
    totalSteps: number;
}

// ARCHITECT: смена фазы раньше была сменой шага мастера и анимировалась его переходом. Теперь фазы
// живут внутри шага, поэтому короткий fade смены состояния ставится здесь — иначе переход
// приветствие → аккаунт был бы единственным мгновенным на экране.
const PHASE_MOTION = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: "easeOut" as const },
};

type IntroPhase = "welcome" | "auth";

export function IntroStep({ onNext, step, totalSteps }: IntroStepProps) {
    const [phase, setPhase] = useState<IntroPhase>("welcome");

    if (phase === "welcome") {
        return (
            <motion.div key="welcome" {...PHASE_MOTION}>
                <WelcomeStep onNext={() => setPhase("auth")} />
            </motion.div>
        );
    }

    // ARCHITECT: «Назад» на фазе аккаунта возвращает к приветствию, а не выводит из мастера:
    // внутри одного шага назад значит предыдущая фаза.
    return (
        <motion.div
            key="auth"
            {...PHASE_MOTION}
            className="mx-auto w-full max-w-4xl px-6 py-16"
        >
            <AuthStep
                onNext={onNext}
                onBack={() => setPhase("welcome")}
                step={step}
                totalSteps={totalSteps}
            />
        </motion.div>
    );
}