// ARCHITECT: конфетти на framer-motion — без canvas и новых зависимостей. Компонент запускается
// монтированием: страница чата меняет key, и разлёт повторяется без внутреннего состояния.
// ARCHITECT: оверлей покрывает всю область чата, поэтому позиции частиц заданы в процентах, а
// полёт — в пикселях. Это мягкая отметка верного ответа, а не салют: opacity не выше 0.6.
// ARCHITECT: классы позиций записаны литералами — Tailwind собирает их из текста, а не из данных.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfettiParticle {
    /** Классы стартовой точки в области чата. */
    readonly at: string;
    readonly x: number;
    readonly y: number;
    readonly delay: number;
    readonly tone: "light" | "green";
}

const PARTICLES: readonly ConfettiParticle[] = [
    { at: "left-[8%] top-[72%]", x: -46, y: -180, delay: 0, tone: "light" },
    { at: "left-[16%] top-[86%]", x: -28, y: -240, delay: 0.04, tone: "green" },
    { at: "left-[24%] top-[64%]", x: -14, y: -150, delay: 0.08, tone: "light" },
    { at: "left-[31%] top-[92%]", x: -8, y: -260, delay: 0.02, tone: "green" },
    { at: "left-[38%] top-[70%]", x: 6, y: -190, delay: 0.1, tone: "light" },
    { at: "left-[45%] top-[84%]", x: 18, y: -250, delay: 0.06, tone: "green" },
    { at: "left-[52%] top-[66%]", x: 32, y: -160, delay: 0.12, tone: "light" },
    { at: "left-[59%] top-[90%]", x: 44, y: -230, delay: 0.03, tone: "green" },
    { at: "left-[66%] top-[74%]", x: 26, y: -200, delay: 0.09, tone: "light" },
    { at: "left-[73%] top-[88%]", x: 40, y: -245, delay: 0.07, tone: "green" },
    { at: "left-[81%] top-[68%]", x: 52, y: -170, delay: 0.05, tone: "light" },
    { at: "left-[88%] top-[82%]", x: 34, y: -215, delay: 0.11, tone: "light" },
    { at: "left-[93%] top-[94%]", x: 46, y: -255, delay: 0.13, tone: "green" },
    { at: "left-[12%] top-[58%]", x: -34, y: -120, delay: 0.14, tone: "light" },
    { at: "left-[47%] top-[56%]", x: 10, y: -110, delay: 0.15, tone: "light" },
    { at: "left-[84%] top-[60%]", x: 30, y: -130, delay: 0.01, tone: "green" },
];

const TONE_CLASS: Record<ConfettiParticle["tone"], string> = {
    light: "bg-[#f0f0f5]",
    green: "bg-green-400",
};

export function ConfettiBurst() {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) return null;

    return (
        <div
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            aria-hidden="true"
        >
            {PARTICLES.map((particle, index) => (
                <motion.span
                    key={index}
                    className={cn("absolute size-1.5 rounded-full", particle.at, TONE_CLASS[particle.tone])}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.7 }}
                    animate={{ opacity: [0, 0.6, 0], x: particle.x, y: particle.y, scale: 1 }}
                    transition={{
                        duration: 0.8,
                        delay: particle.delay,
                        ease: "easeOut",
                        opacity: { duration: 0.8, times: [0, 0.2, 1] },
                    }}
                />
            ))}
        </div>
    );
}