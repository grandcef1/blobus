// ARCHITECT: купол глобуса. Темп отрисовки — ×1.5 от исходного (полный цикл ~2.3s):
// быстрее церемониального, но не торопливо-резкий. Разнонаправленный рост линий
// (strokeDashoffset от 1 или от -1 к 0), усиленное трёхслойное свечение, статичный купол.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WelcomeGlobeProps {
    className?: string;
}

const DRAW_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

const GLOW_FILTER =
    "[filter:drop-shadow(0_0_8px_rgba(240,240,245,0.5))_drop-shadow(0_0_20px_rgba(240,240,245,0.25))_drop-shadow(0_0_40px_rgba(240,240,245,0.15))]";

export function WelcomeGlobe({ className }: WelcomeGlobeProps) {
    const reduceMotion = useReducedMotion();

    const draw = (from: 1 | -1, delay: number, duration: number, opacity: number) =>
        reduceMotion
            ? { opacity }
            : {
                initial: { strokeDashoffset: from, opacity: 0 },
                animate: { strokeDashoffset: 0, opacity },
                transition: { delay, duration, ease: DRAW_EASE },
            };

    const stroke = {
        fill: "none",
        stroke: "#f0f0f5",
        strokeLinecap: "round" as const,
        pathLength: 1,
        strokeDasharray: "1",
    };

    return (
        <svg
            viewBox="0 0 1600 480"
            preserveAspectRatio="xMidYMax slice"
            className={cn(GLOW_FILTER, className)}
            aria-hidden="true"
            focusable="false"
        >
            {/* контур купола — рост справа налево */}
            <motion.path
                d="M 40 480 A 760 460 0 0 1 1560 480"
                strokeWidth={2.2}
                {...stroke}
                {...draw(-1, 0, 1.6, 0.55)}
            />
            {/* меридианы — встречные направления */}
            <motion.path
                d="M 180 480 A 620 460 0 0 1 1420 480"
                strokeWidth={1.6}
                {...stroke}
                {...draw(1, 0.2, 1.5, 0.3)}
            />
            <motion.path
                d="M 400 480 A 400 460 0 0 1 1200 480"
                strokeWidth={1.6}
                {...stroke}
                {...draw(-1, 0.35, 1.3, 0.22)}
            />
            {/* ось — поднимается снизу вверх */}
            <motion.line
                x1={800}
                y1={20}
                x2={800}
                y2={480}
                strokeWidth={1.6}
                {...stroke}
                {...draw(-1, 0.45, 1.2, 0.25)}
            />
            {/* параллели — чередование направлений */}
            <motion.line
                x1={76}
                y1={340}
                x2={1524}
                y2={340}
                strokeWidth={1.6}
                {...stroke}
                {...draw(1, 0.6, 1.2, 0.3)}
            />
            <motion.line
                x1={197}
                y1={200}
                x2={1403}
                y2={200}
                strokeWidth={1.6}
                {...stroke}
                {...draw(-1, 0.75, 1.1, 0.24)}
            />
            <motion.line
                x1={397}
                y1={90}
                x2={1203}
                y2={90}
                strokeWidth={1.6}
                {...stroke}
                {...draw(1, 0.85, 0.9, 0.18)}
            />
            {/* горизонт — завершает композицию */}
            <motion.line
                x1={0}
                y1={479.5}
                x2={1600}
                y2={479.5}
                strokeWidth={2}
                {...stroke}
                {...draw(-1, 1, 1.3, 0.5)}
            />
        </svg>
    );
}