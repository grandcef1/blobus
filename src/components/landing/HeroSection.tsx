// src/components/landing/HeroSection.tsx
import { motion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import { Check, Play, Zap } from "lucide-react";

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
        // ARCHITECT: flex-col-reverse — на мобильных Blobatar сверху, текст снизу;
        // с md: — текст слева, Blobatar справа. overflow-hidden страхует от вылета декора.
        <section className="relative w-full max-w-full overflow-hidden bg-black px-4 pt-24 pb-16 sm:px-6 md:pt-32 md:pb-24 lg:px-8">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center justify-between gap-8 md:flex-row md:gap-12"
            >
                <div className="flex w-full min-w-0 flex-col items-center justify-center gap-6 text-center md:w-1/2 md:items-start md:gap-8 md:text-left">
                    <motion.div variants={badgeVariants}>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 text-[#f0f0f5] px-3 py-1 text-sm">
                            <Zap className="size-3.5 fill-[#f0f0f5]/20 text-[#f0f0f5]" aria-hidden="true" />
                            Новый способ учить английский
                        </span>
                    </motion.div>

                    <motion.div variants={titleVariants}>
                        <TypewriterHeading />
                    </motion.div>

                    <motion.p
                        variants={subtitleVariants}
                        className="max-w-xl text-base text-pretty text-[#f0f0f5]/60 sm:text-lg md:text-xl"
                    >
                        Персональные уроки, разговорная практика и подготовка к
                        собеседованиям — всё в одном месте
                    </motion.p>

                    <motion.div
                        variants={actionsVariants}
                        className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4"
                    >
                        <Button
                            size="lg"
                            className="h-12 w-full rounded-full bg-[#f0f0f5] px-6 text-base text-black shadow-none hover:bg-white sm:w-auto"
                        >
                            Начать бесплатно
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 w-full rounded-full border border-[#f0f0f5]/30 bg-transparent px-6 text-base text-[#f0f0f5] shadow-none hover:bg-[#f0f0f5]/10 hover:text-[#f0f0f5] sm:w-auto"
                        >
                            <Play className="mr-2 size-4" aria-hidden="true" />
                            Смотреть демо
                        </Button>
                    </motion.div>

                    <motion.div
                        variants={benefitsVariants}
                        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 md:justify-start"
                    >
                        {BENEFITS.map((benefit) => (
                            <div
                                key={benefit.label}
                                className="flex items-center gap-1.5 text-sm text-[#f0f0f5]/50"
                            >
                                <Check className="size-3.5 shrink-0 text-[#f0f0f5]/60" aria-hidden="true" />
                                <span className="whitespace-nowrap">{benefit.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <motion.div
                    variants={blobatarVariants}
                    className="flex w-full shrink-0 justify-center md:w-1/2 md:justify-end"
                >
                    <BrandBlobatar />
                </motion.div>
            </motion.div>
        </section>
    );
}
