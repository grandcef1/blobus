// ARCHITECT: секция how-it-works — тот же маршрут, что у мастера: пять пунктов и их длительность.
// Подписи берутся из ONBOARDING_STEP_TITLES, поэтому лендинг и мастер не могут разойтись.
// ARCHITECT: три визуальных блока прежней версии убраны вместе со старым содержимым: в продукте
// пять шагов, и подпись «одно действие на абзац» больше не описывала мастер.

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Check } from "lucide-react";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";

interface ChecklistItem {
    readonly title: string;
    readonly time: string;
}

const CHECKLIST: readonly ChecklistItem[] = [
    { title: ONBOARDING_STEP_TITLES.intro, time: "1 мин" },
    { title: ONBOARDING_STEP_TITLES.assessment, time: "7 мин" },
    { title: ONBOARDING_STEP_TITLES.goals, time: "1 мин" },
    { title: ONBOARDING_STEP_TITLES.schedule, time: "1 мин" },
    { title: ONBOARDING_STEP_TITLES.lesson, time: "сразу" },
];

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" },
    },
};

export function HowItWorksSection() {
    return (
        <section id="how-it-works" className="relative w-full bg-black py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
                        Пять шагов от знакомства до первого урока
                    </p>
                </motion.header>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="max-w-xl rounded-3xl border border-white/5 bg-white/[0.02] p-6 md:p-8"
                >
                    <h3 className="text-lg font-semibold text-[#f0f0f5] md:text-xl">
                        10 минут до старта
                    </h3>

                    <ul className="mt-6 divide-y divide-white/5">
                        {CHECKLIST.map((item) => (
                            <motion.li
                                key={item.title}
                                variants={itemVariants}
                                className="flex items-baseline justify-between gap-4 py-3"
                            >
                                <span className="flex items-center gap-3 text-sm text-[#f0f0f5]/80 md:text-base">
                                    <Check
                                        className="size-4 shrink-0 text-[#f0f0f5]/40"
                                        aria-hidden="true"
                                    />
                                    {item.title}
                                </span>
                                <span className="text-xs tabular-nums text-[#f0f0f5]/40 md:text-sm">
                                    {item.time}
                                </span>
                            </motion.li>
                        ))}
                    </ul>

                    <p className="mt-6 text-xs text-[#f0f0f5]/40 md:text-sm">
                        Адаптивный тест определит ваш уровень A1–C2
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
