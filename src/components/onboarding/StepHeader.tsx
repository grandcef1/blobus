// ARCHITECT: заголовок шага — одна точка правды для eyebrow, шкалы заголовков,
// подзаголовка и мета-строки «Шаг N из 5». Появление с stagger 0.1 между детьми,
// easeOut 0.3 — как в требованиях к переходам.

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { EYEBROW, META_LINE, STEP_SUBTITLE, STEP_TITLE } from "@/lib/surfaces";

interface StepHeaderProps {
    eyebrow: string;
    title: string;
    subtitle?: string;
    step: number;
    totalSteps: number;
    align?: "center" | "left";
    className?: string;
}

const CONTAINER: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const ITEM: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function StepHeader({
    eyebrow,
    title,
    subtitle,
    step,
    totalSteps,
    align = "center",
    className,
}: StepHeaderProps) {
    const isCentered = align === "center";

    return (
        <motion.header
            variants={CONTAINER}
            initial="hidden"
            animate="visible"
            className={cn("mb-8", isCentered && "text-center", className)}
        >
            <motion.p variants={ITEM} className={EYEBROW}>
                {eyebrow}
            </motion.p>

            <motion.h2 variants={ITEM} className={cn(STEP_TITLE, "mt-3")}>
                {title}
            </motion.h2>

            {subtitle && (
                <motion.p
                    variants={ITEM}
                    className={cn(STEP_SUBTITLE, "mt-3", isCentered && "mx-auto max-w-md")}
                >
                    {subtitle}
                </motion.p>
            )}

            <motion.p variants={ITEM} className={cn(META_LINE, "mt-4")}>
                Шаг {step} из {totalSteps}
            </motion.p>
        </motion.header>
    );
}
