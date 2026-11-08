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
            {/* ARCHITECT (RESPONSIVE FIX #3 — параллельность с features):
                Шелл px-4 sm:px-6 lg:px-8 идентичен шеллу features/how-it-works —
                ниже xl оба фулл-ширинные, кромки уже параллельны.
                С xl features центрируется в max-w-6xl, и дельта до его контент-кромки
                = 96px на любом вьюпорте >=1280 (проверено: 96/416/736px на 1280/1920/2560).
                xl:pl-24 компенсирует её ВНУТРИ шелла max-w-7xl: заголовок hero встает
                строго на одну вертикаль с заголовком features ("Новый способ…" и badge — тоже).
                ARCHITECT (правая пустота): блобатар через xl:justify-end + pr-8 дотягивается
                до 1568px на 1920 — на 64px дальше правой кромки карточек features (1504px).
                Итог: справа мёртвой зоны больше нет, слева 416px / справа 352px —
                лёгкая асимметрия 64px (premium-паттерн: без зеркальной симметрии),
                при этом композиция делит центральную ось с features. */}
            <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:pl-24">
                {/* ARCHITECT: xl:grid-cols-[1fr_1.25fr] жёстко связывает текст и блоба.
                    xl:gap-4 прижимает их друг к другу, сохраняя профессиональный ритм.
                    items-center гарантирует вертикальное параллельное выравнивание.
                    ARCHITECT (RESPONSIVE FIX #1): order-классы дают мобильную композицию
                    "блобатар СВЕРХУ текста", не меняя md+ (текст слева, блоб справа). */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-8 lg:gap-12 xl:grid-cols-[1fr_1.25fr] xl:gap-4"
                >
                    {/* Текстовый блок: выровнен по левому краю, без лишних отступов.
                        ARCHITECT (RESPONSIVE FIX #1): order-2 на mobile — текст уходит ПОД блобатара. */}
                    <div className="order-2 flex flex-col justify-center gap-7 md:order-1 xl:max-w-[36rem]">
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

                    {/* ARCHITECT: Блобатар в потоке grid, без absolute.
                        ARCHITECT (RESPONSIVE FIX #1 — mobile): order-1 поднимает блобатара
                        НАД текстом; w-[min(85vw,32rem)] даёт ~331px на телефоне 390px
                        вместо прежних 256px — заметно крупнее, но не вылезает за вьюпорт.
                        ARCHITECT (FIX #3 — desktop): колонка блобатара после xl:pl-24 =
                        631px (рендер во всю колонку, потолок 42rem не достигается) —
                        массивность сохранена; xl:justify-end прижимает его к правой кромке
                        шелла, закрывая бывшую мёртвую зону справа. */}
                    <motion.div
                        variants={blobatarVariants}
                        className="order-1 flex items-center justify-center md:order-2 xl:justify-end"
                    >
                        <BrandBlobatar className="w-[min(85vw,32rem)] sm:w-96 md:w-full md:max-w-[26rem] lg:max-w-[34rem] xl:w-full xl:max-w-[42rem]" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}