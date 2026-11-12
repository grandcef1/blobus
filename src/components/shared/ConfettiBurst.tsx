// ARCHITECT: конфетти на framer-motion — без canvas и новых зависимостей. Позиции частиц заданы
// статически: Math.random в рендере давал бы новую траекторию на каждый кадр.
// ARCHITECT: 16 частиц — потолок, при котором разлёт читается как короткая радость, а не салют.
// prefers-reduced-motion отключает разлёт полностью: движение не несёт информации.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfettiBurstProps {
    /** true запускает разлёт; снять можно только через размонтирование вызывающей стороной. */
    trigger: boolean;
}

interface ConfettiParticle {
    readonly x: number;
    readonly y: number;
    readonly delay: number;
    readonly tone: "light" | "green";
}

const PARTICLES: readonly ConfettiParticle[] = [
    { x: -58, y: -34, delay: 0, tone: "light" },
    { x: -42, y: -56, delay: 0.04, tone: "green" },
    { x: -26, y: -22, delay: 0.08, tone: "light" },
    { x: -14, y: -58, delay: 0.02, tone: "green" },
    { x: 6, y: -30, delay: 0.1, tone: "light" },
    { x: 20, y: -52, delay: 0.06, tone: "green" },
    { x: 34, y: -18, delay: 0.12, tone: "light" },
    { x: 52, y: -40, delay: 0.03, tone: "green" },
    { x: 62, y: -12, delay: 0.09, tone: "light" },
    { x: -50, y: -8, delay: 0.07, tone: "green" },
    { x: 44, y: -6, delay: 0.05, tone: "light" },
    { x: 12, y: -62, delay: 0.11, tone: "light" },
    { x: -34, y: -44, delay: 0.13, tone: "light" },
    { x: 28, y: -36, delay: 0.01, tone: "light" },
    { x: -6, y: -50, delay: 0.14, tone: "green" },
    { x: 58, y: -28, delay: 0.15, tone: "light" },
];

const TONE_CLASS: Record<ConfettiParticle["tone"], string> = {
    light: "bg-[#f0f0f5]",
    green: "bg-green-400",
};

export function ConfettiBurst({ trigger }: ConfettiBurstProps) {
    const reduceMotion = useReducedMotion();

    if (!trigger || reduceMotion) return null;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {PARTICLES.map((particle, index) => (
                <motion.span
                    key={index}
                    className={cn(
                        "absolute left-1/2 top-1/2 -ml-0.5 -mt-0.5 size-1.5 rounded-full",
                        TONE_CLASS[particle.tone]
                    )}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                    animate={{ opacity: 0, x: particle.x, y: particle.y, scale: 0.7 }}
                    transition={{ duration: 0.75, delay: particle.delay, ease: "easeOut" }}
                />
            ))}
        </div>
    );
}