import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { ComponentType } from "react";

import { GoalSvg } from "./visuals/GoalSvg";
import { DialogueSvg } from "./visuals/DialogueSvg";
import { GrowthSvg } from "./visuals/GrowthSvg";

interface StepData {
    readonly number: string;
    readonly title: string;
    readonly description: string;
    readonly Visual: ComponentType;
}

const STEPS: readonly StepData[] = [
    {
        number: "01",
        title: "Фокус на цели",
        description: "Выберите трек: разговорная практика, собеседование или грамматика. ИИ мгновенно адаптирует сценарий и сложность под ваши задачи.",
        Visual: GoalSvg,
    },
    {
        number: "02",
        title: "Естественный диалог",
        description: "Общайтесь голосом или текстом. ИИ поддерживает контекст, мягко корректирует ошибки в реальном времени и ведёт себя как живой ментор.",
        Visual: DialogueSvg,
    },
    {
        number: "03",
        title: "Мгновенный рост",
        description: "Получайте детальный разбор после каждой сессии. Персональный дашборд с трекингом прогресса и работой над ошибками.",
        Visual: GrowthSvg,
    },
] as const;

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.15 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" },
    },
};

export function HowItWorksSection() {
    return (
        <section id="how-it-works" className="relative w-full bg-black py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                {/* ARCHITECT: отступ уменьшен для более плотной и премиальной композиции */}
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-12 md:mb-16"
                >
                    <h2 className="text-3xl font-bold tracking-tight text-[#f0f0f5] md:text-5xl">
                        Как работает Blobus
                    </h2>
                    <p className="mt-4 max-w-2xl text-base text-[#f0f0f5]/60 md:text-lg">
                        Три простых шага от регистрации до уверенного владения языком
                    </p>
                </motion.header>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col"
                >
                    {STEPS.map((step, index) => {
                        const Visual = step.Visual;
                        const isLast = index === STEPS.length - 1;

                        return (
                            <motion.div
                                key={step.number}
                                variants={itemVariants}
                                className="group relative flex flex-col gap-8 py-10 md:flex-row md:items-center md:gap-16 md:py-16"
                            >
                                {!isLast && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent md:left-1/2 md:right-auto md:w-1/2 md:-translate-x-1/2"
                                        aria-hidden="true"
                                    />
                                )}

                                <div className="flex flex-1 flex-col gap-3 md:gap-5">
                                    <span className="text-sm font-medium text-white/30 transition-colors duration-300 group-hover:text-white/60">
                                        {step.number}
                                    </span>
                                    <h3 className="text-2xl font-semibold text-[#f0f0f5]/80 transition-colors duration-300 group-hover:text-[#f0f0f5] md:text-3xl">
                                        {step.title}
                                    </h3>
                                    <p className="max-w-md text-base leading-relaxed text-[#f0f0f5]/50 transition-colors duration-300 group-hover:text-[#f0f0f5]/70">
                                        {step.description}
                                    </p>
                                </div>

                                <div className="flex flex-1 items-center justify-center md:justify-end">
                                    {/* ARCHITECT: убраны любые классы, создающие "квадрат". 
                                        Используем чистый radial-gradient, который гарантированно 
                                        уходит в прозрачность без артефактов и границ. */}
                                    <div className="relative flex items-center justify-center p-4 transition-transform duration-700 ease-out group-hover:scale-105">
                                        <div
                                            className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-100 opacity-0 pointer-events-none"
                                            style={{
                                                background: "radial-gradient(circle at center, rgba(240, 240, 245, 0.08) 0%, transparent 70%)",
                                                filter: "blur(24px)",
                                            }}
                                            aria-hidden="true"
                                        />
                                        <Visual />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}