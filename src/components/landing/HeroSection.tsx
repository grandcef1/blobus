import { motion } from "framer-motion";
import type { TargetAndTransition, Variants } from "framer-motion";
import { Play, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandBlobatar } from "@/components/landing/BrandBlobatar";

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
const blobatarVariants = fadeInUp(0.4);

export function HeroSection() {
    return (
        // ARCHITECT: отступ 56px, flex items-center для выравнивания Blobatar и текста.
        // Шаг 1: убрано вертикальное центрирование всей секции (min-h-*/h-screen больше нет) — обычный поток w-full.
        // Шаг 2: точный отступ сверху pt-[56px] ставится на саму <section>, а НЕ на grid-контейнер:
        // иначе padding попал бы внутрь grid-элемента, который растягивается на всю высоту строки, и items-center
        // центрировал бы колонки внутри области с учётом паддинга — Blobatar снова уехал бы вниз относительно текста.
        // На section паддинг остаётся вне строк грида → обе колонки центрируются в одной чистой области, оси совпадают.
        // Шаг 4: собственный translateY(-25px)/margin-top у Blobatar убраны (выравнивание только через items-center родителя).
        <section className="w-full bg-black pt-[16px]">
            {/* ARCHITECT: grid + items-center (не items-start/items-end) — Blobatar и текст на одной горизонтальной оси */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 items-center gap-12 mx-auto max-w-6xl px-6 md:grid-cols-2"
            >
                <div className="flex flex-col justify-center gap-8">
                    <motion.div variants={badgeVariants}>
                        {/* ARCHITECT: бейдж обесцвечен под новую палитру: полупрозрачная белёсая плашка на чёрном */}
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 text-[#fffce1] px-3 py-1 text-sm">
                            <Sparkles className="size-4" aria-hidden="true" />
                            Новый способ учить английский
                        </span>
                    </motion.div>

                    <motion.h1
                        variants={titleVariants}
                        // ARCHITECT: цветные утилитарные классы демонтированы → сплошной цвет основной палитры #fffce1
                        className="text-4xl md:text-6xl font-bold text-[#fffce1]"
                    >
                        Учи английский с ИИ-репетитором
                    </motion.h1>

                    <motion.p
                        variants={subtitleVariants}
                        // ARCHITECT: приглушённый текст в оттенке палитры (#fffce1 с прозрачностью), вместо цветного gray/zinc
                        className="text-lg md:text-xl text-[#fffce1]/60 max-w-xl"
                    >
                        Персональные уроки, разговорная практика и подготовка к
                        собеседованиям — всё в одном месте
                    </motion.p>

                    <motion.div variants={actionsVariants} className="flex flex-wrap gap-4">
                        {/* ARCHITECT: primary — инверсная белёсая pill-кнопка на чёрном фоне, shadow-none */}
                        <Button
                            size="lg"
                            className="rounded-full shadow-none bg-[#fffce1] text-black hover:bg-white"
                        >
                            Начать бесплатно
                        </Button>
                        {/* ARCHITECT: outline — прозрачная pill-кнопка с тонкой светлой рамкой, shadow-none */}
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-full shadow-none border border-[#fffce1]/30 bg-transparent text-[#fffce1] hover:bg-[#fffce1]/10 hover:text-[#fffce1]"
                        >
                            <Play aria-hidden="true" />
                            Смотреть демо
                        </Button>
                    </motion.div>

                    {/* ARCHITECT: строка доверия в приглушённом оттенке палитры */}
                    <p className="text-sm text-[#fffce1]/40">
                        ✓ Бесплатно 7 дней · ✓ Без карты · ✓ Отмена в любой момент
                    </p>
                </div>

                <motion.div variants={blobatarVariants}>
                    <BrandBlobatar className="mx-auto" />
                </motion.div>
            </motion.div>
        </section>
    );
}