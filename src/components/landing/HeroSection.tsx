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
        <section className="min-h-screen bg-white">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 items-center gap-12 mx-auto max-w-6xl px-6 min-h-screen md:grid-cols-2"
            >
                <div className="flex flex-col justify-center gap-6">
                    <motion.div variants={badgeVariants}>
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-600 px-3 py-1 text-sm">
                            <Sparkles className="size-4" aria-hidden="true" />
                            Новый способ учить английский
                        </span>
                    </motion.div>

                    <motion.h1
                        variants={titleVariants}
                        className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                    >
                        Учи английский с ИИ-репетитором
                    </motion.h1>

                    <motion.p
                        variants={subtitleVariants}
                        className="text-lg md:text-xl text-gray-600 max-w-xl"
                    >
                        Персональные уроки, разговорная практика и подготовка к
                        собеседованиям — всё в одном месте
                    </motion.p>

                    <motion.div variants={actionsVariants} className="flex flex-wrap gap-4">
                        <Button size="lg">Начать бесплатно</Button>
                        <Button variant="outline" size="lg">
                            <Play aria-hidden="true" />
                            Смотреть демо
                        </Button>
                    </motion.div>

                    <p className="text-sm text-gray-500">
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