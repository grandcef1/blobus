// ARCHITECT: колонка блобатара вынесена из HeroSection, чтобы страница уложилась в лимит 150 строк и
// освободила место под замеренные инварианты вёрстки; визуальный результат идентичен прежнему.
// ARCHITECT: variants приходят пропсом — анимация задаётся в HeroSection (fadeInUp(0.4)) и должна
// наследовать stagger родительского motion-контейнера, дублировать тайминги здесь нельзя.

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { BrandBlobatar } from "@/components/landing/BrandBlobatar";

interface HeroBlobatarProps {
    readonly variants: Variants;
}

export function HeroBlobatar({ variants }: HeroBlobatarProps) {
    return (
        // ARCHITECT: блобатар в потоке grid (без absolute), order-1 поднимает его над текстом
        // на мобильном; xl:justify-end прижимает к правой кромке шелла.
        <motion.div variants={variants} className="order-1 flex items-center justify-center md:order-2 xl:justify-end">
            <BrandBlobatar className="w-[min(85vw,32rem)] sm:w-96 md:w-full md:max-w-[26rem] lg:max-w-[34rem] xl:w-full xl:max-w-[42rem]" />
        </motion.div>
    );
}