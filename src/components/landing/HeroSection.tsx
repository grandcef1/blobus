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
        <section className="w-full bg-black pt-[0px]">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 items-center gap-12 mx-auto max-w-6xl px-6 md:grid-cols-2"
            >
                <div className="flex flex-col justify-center gap-8">
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

                <motion.div variants={blobatarVariants}>
                    <BrandBlobatar className="mx-auto" />
                </motion.div>
            </motion.div>
        </section>
    );
}