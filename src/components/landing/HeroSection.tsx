import { useState } from "react";
import { motion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import { Check, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthAwareCta, SECONDARY_CTA } from "@/components/landing/AuthAwareCta";
import { HeroBlobatar } from "@/components/landing/HeroBlobatar";
import { HeroBadge } from "@/components/hero/HeroBadge";
import { TypewriterHeading } from "@/components/landing/TypewriterHeading";
import { DemoDialog } from "@/components/landing/demo/DemoDialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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

const titleVariants = fadeInUp(0.1);
const subtitleVariants = fadeInUp(0.2);
const actionsVariants = fadeInUp(0.3);
const benefitsVariants = fadeInUp(0.4);
const blobatarVariants = fadeInUp(0.4);

// ARCHITECT: подписи выгод — ключи словаря landing: строка не может остаться русской в en/es.
const BENEFITS = ["hero.benefits.trial", "hero.benefits.noCard", "hero.benefits.cancel"] as const;

export function HeroSection() {
    const navigate = useNavigate();
    const { t } = useTranslation("landing");
    const { t: tCommon } = useTranslation("common");
    // ARCHITECT: пример урока — модалка: вторичная кнопка объясняет формат, а не прыгает по странице.
    const [demoOpen, setDemoOpen] = useState(false);

    const handleGetStarted = () => {
        navigate("/onboarding");
    };

    return (
        // ARCHITECT: overflow-x-clip страхует bleed. min-h = вьюпорт минус хедер.
        <section className="relative flex min-h-[calc(100dvh-72px)] w-full items-start overflow-x-clip bg-black pt-16 pb-16 md:pt-20 md:pb-20">
            {/* ARCHITECT: шелл идентичен features/how-it-works (px-4 sm:px-6 lg:px-8), поэтому кромки параллельны
                ниже xl; xl:pl-24 внутри max-w-7xl ставит h1 на вертикаль features: дельта до её кромки = 96 px
                (замерено 96/416/736 px на 1280/1920/2560). Колонки связаны жёстко: xl:grid-cols-[1fr_1.25fr]
                и xl:gap-4; items-center — их вертикальная параллельность. Колонка блобатара после xl:pl-24 = 631 px.
                Блобатар w-[min(85vw,32rem)] ≈ 331 px на телефоне 390 px (было 256); xl:justify-end доводит его до
                1568 px на 1920 — на 64 px дальше правой кромки карточек features (1504), правая мёртвая зона закрыта.
                Асимметрия 64 px осознанная: без зеркальной симметрии, композиция делит центральную ось с features. */}
            <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 xl:pl-24">
                {/* ARCHITECT: на мобильном hero выровнен по левой кромке и занимает всю ширину шелла, как остальные
                    секции; прежнее центрирование ломало ритм страницы и делало hero единственным центрированным блоком. */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-8 lg:gap-12 xl:grid-cols-[1fr_1.25fr] xl:gap-4"
                >
                    {/* ARCHITECT: order-2 на mobile — текст под блобатаром; с md текст слева. */}
                    <div className="order-2 flex flex-col items-center justify-center gap-7 text-center md:order-1 md:items-start md:text-left xl:max-w-[36rem]">
                        <HeroBadge label={t("hero.badge")} />
                        <motion.div variants={titleVariants}>
                            <TypewriterHeading />
                        </motion.div>
                        {/* ARCHITECT: text-balance держит подводку двумя строками без обрывков. */}
                        {/* ARCHITECT: центрированная композиция на мобильном выбрана владельцем после сравнения с левым
                            выравниванием и выравниванием по ширине: левый вариант делал hero единственным выровненным
                            иначе блоком, а по ширине на узкой мере давало крупные пробелы. Кегль остался увеличенным. */}
                        <motion.p
                            variants={subtitleVariants}
                            className="mx-auto max-w-xl text-balance text-base leading-relaxed text-[#f0f0f5]/60 md:mx-0 md:text-lg"
                        >
                            {t("hero.subtitle")}
                        </motion.p>

                        <motion.div
                            variants={actionsVariants}
                            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4"
                        >
                            <AuthAwareCta
                                variant="text"
                                className={cn(SECONDARY_CTA, "w-full justify-center sm:w-auto")}
                            >
                                <Button
                                    size="lg"
                                    onClick={handleGetStarted}
                                    className="w-full rounded-full shadow-none bg-[#f0f0f5] text-black hover:bg-white sm:w-auto"
                                >
                                    {tCommon("actions.startFree")}
                                </Button>
                            </AuthAwareCta>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => setDemoOpen(true)}
                                className="w-full rounded-full shadow-none border border-[#f0f0f5]/30 bg-transparent text-[#f0f0f5] hover:bg-[#f0f0f5]/10 hover:text-[#f0f0f5] sm:w-auto"
                            >
                                <MessageCircle className="mr-2 size-4" aria-hidden="true" />
                                {t("hero.demo.title")}
                            </Button>
                            <DemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
                        </motion.div>

                        <motion.div
                            variants={benefitsVariants}
                            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 md:justify-start"
                        >
                            {BENEFITS.map((benefitKey) => (
                                <div
                                    key={benefitKey}
                                    className="flex items-center gap-1.5 text-xs text-[#f0f0f5]/50"
                                >
                                    <Check
                                        className="size-3 text-[#f0f0f5]/60"
                                        aria-hidden="true"
                                    />
                                    <span className="whitespace-nowrap">{t(benefitKey)}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    <HeroBlobatar variants={blobatarVariants} />
                </motion.div>
            </div>
        </section>
    );
}
