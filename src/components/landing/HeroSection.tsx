// src/components/landing/HeroSection.tsx
import { motion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import { Check, Play, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandBlobatar } from "@/components/landing/BrandBlobatar";
import { TypewriterHeading } from "@/components/landing/TypewriterHeading";

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const hiddenState: TargetAndTransition = { opacity: 0, y: 20 };

function fadeInUp(delay: number): Variants {
    return {
        hidden: hiddenState,
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut", delay },
        },
    };
}

const badgeVariants = fadeInUp(0);
const titleVariants = fadeInUp(0.1);
const subtitleVariants = fadeInUp(0.2);
const actionsVariants = fadeInUp(0.3);
const benefitsVariants = fadeInUp(0.4);
const blobatarVariants = fadeInUp(0.4);

interface BenefitItem {
    label: string;
}

const BENEFITS: readonly BenefitItem[] = [
    { label: "Бесплатно 7 дней" },
    { label: "Без привязки карты" },
    { label: "Отмена в любой момент" },
];

export function HeroSection() {
    return (
        // ARCHITECT: центрирование контента в видимой области на верхней позиции
        // скролла. min-h = вьюпорт минус высота хедера (72px — ЕДИНСТВЕННАЯ
        // константа для подстройки, если хедер другой высоты).
        // Асимметрия pt >> pb смещает оптический центр вниз: контент не уползает
        // к хедеру и не оставляет пустоту под собой. pt-28/32 — воздух от хедера.
        <section className="relative flex min-h-[calc(100dvh-72px)] w-full items-center bg-black pt-32 pb-20 md:pt-40 md:pb-29">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 items-center gap-12 mx-auto max-w-6xl px-6 md:grid-cols-[1.05fr_0.95fr] lg:grid-cols-[1.15fr_0.85fr]"
            >
                {/* ARCHITECT: прогрессивный левый паддинг на md/lg отвязывает текстовый
                    блок от левой кромки контейнера Features — hero дышит
                    самостоятельнее, не выглядит прижатым влево. */}
                <div className="flex flex-col justify-center gap-8 md:pl-8 lg:pl-14">
                    {/* ARCHITECT: компактная пилюля-бейдж: иконка Sparkles спереди,
                        текст следом. Кегль 11px + трекинг — редакционная строка,
                        а не плашка. Hover: рамка светлеет, иконка слегка поворачивается. */}
                    <motion.div variants={badgeVariants}>
                        <a
                            href="#features"
                            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] tracking-[0.14em] text-[#f0f0f5]/70 uppercase transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-[#f0f0f5]"
                        >
                            <Sparkles
                                className="size-3.5 text-[#f0f0f5]/80 transition-transform duration-300 group-hover:rotate-12"
                                aria-hidden="true"
                            />
                            Новый способ учить английский
                        </a>
                    </motion.div>

                    <motion.div variants={titleVariants}>
                        <TypewriterHeading />
                    </motion.div>

                    <motion.p
                        variants={subtitleVariants}
                        className="text-lg md:text-xl text-[#f0f0f5]/60 max-w-xl"
                    >
                        Персональные уроки, разговорная практика и подготовка к
                        собеседованиям — всё в одном месте
                    </motion.p>

                    <motion.div variants={actionsVariants} className="flex flex-wrap gap-4">
                        <Button
                            size="lg"
                            className="rounded-full shadow-none bg-[#f0f0f5] text-black hover:bg-white"
                        >
                            Начать бесплатно
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-full shadow-none border border-[#f0f0f5]/30 bg-transparent text-[#f0f0f5] hover:bg-[#f0f0f5]/10 hover:text-[#f0f0f5]"
                        >
                            <Play className="mr-2 size-4" aria-hidden="true" />
                            Смотреть демо
                        </Button>
                    </motion.div>

                    <motion.div
                        variants={benefitsVariants}
                        className="flex items-center gap-3 pt-2"
                    >
                        {BENEFITS.map((benefit) => (
                            <div
                                key={benefit.label}
                                className="flex items-center gap-1.5 text-xs text-[#f0f0f5]/50"
                            >
                                <Check className="size-3 text-[#f0f0f5]/60" aria-hidden="true" />
                                <span className="whitespace-nowrap">{benefit.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* ARCHITECT: масштаб через обёртку-transform — паттерн принят в проекте
                    (ChatPreview), не трогаем внутренности BrandBlobatar и gaze tracking. */}
                <motion.div variants={blobatarVariants}>
                    <div className="scale-110 sm:scale-125 lg:scale-150">
                        <BrandBlobatar className="mx-auto" />
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
}