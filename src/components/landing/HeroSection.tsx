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
    { label: "Без привязки karty" },
    { label: "Отмена в любой момент" },
];

export function HeroSection() {
    return (
        // ARCHITECT: overflow-x-clip страхует bleed. min-h = вьюпорт минус хедер.
        <section className="relative flex min-h-[calc(100dvh-72px)] w-full items-start overflow-x-clip bg-black pt-16 pb-16 md:pt-20 md:pb-20">
            <div className="relative w-full max-w-7xl ml-[12%] mr-[0%] px-6 lg:px-10">
                {/* ARCHITECT: xl:grid-cols-[1fr_1.25fr] жёстко связывает текст и блоба. 
                    xl:gap-4 прижимает их друг к другу, сохраняя профессиональный ритм. 
                    items-center гарантирует вертикальное параллельное выравнивание. */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-8 lg:gap-12 xl:grid-cols-[1fr_1.25fr] xl:gap-4"
                >
                    {/* Текстовый блок: выровнен по левому краю, без лишних отступов */}
                    <div className="flex flex-col justify-center gap-7 xl:max-w-[36rem]">
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
                            className="max-w-[48ch] text-balance text-lg leading-relaxed text-[#f0f0f5]/60 md:text-xl md:leading-relaxed"
                        >
                            Персональные уроки, разговорная практика и подготовка к
                            собеседованиям — всё в одном месте
                        </motion.p>

                        <motion.div
                            variants={actionsVariants}
                            className="flex flex-wrap gap-4"
                        >
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
                                <Play
                                    className="mr-2 size-4"
                                    aria-hidden="true"
                                />
                                Смотреть демо
                            </Button>
                        </motion.div>

                        <motion.div
                            variants={benefitsVariants}
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
                        >
                            {BENEFITS.map((benefit) => (
                                <div
                                    key={benefit.label}
                                    className="flex items-center gap-1.5 text-xs text-[#f0f0f5]/50"
                                >
                                    <Check
                                        className="size-3 text-[#f0f0f5]/60"
                                        aria-hidden="true"
                                    />
                                    <span className="whitespace-nowrap">
                                        {benefit.label}
                                    </span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* ARCHITECT: Блобатар теперь в потоке grid, без absolute. 
                        xl:max-w-[42rem] (672px) делает его заметно крупнее и массивнее, 
                        а 85dvh страхует от вертикального переполнения на низких экранах. */}
                    <motion.div 
                        variants={blobatarVariants} 
                        className="flex items-center justify-center xl:justify-end"
                    >
                        <BrandBlobatar className="w-64 sm:w-80 md:w-full md:max-w-[24rem] lg:max-w-[32rem] xl:max-w-[42rem] xl:w-full" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}