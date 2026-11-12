// ARCHITECT: короткое поздравление вместо частиц: понятная анимация «Верно» читается быстрее
// разлёта конфетти и не спорит с лентой сообщений.
// ARCHITECT: компонент запускается монтированием (страница чата меняет key) и сам снимает себя по
// таймеру, поэтому наружу не нужен ни callback, ни второе состояние.

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

/** Полный срок жизни: вход бейджа, короткое удержание и затухание. */
const HOLD_MS = 1100;

const BADGE =
    "relative flex size-12 items-center justify-center rounded-full border border-green-400/40 bg-green-500/10 text-green-400";
const RING = "absolute inset-0 rounded-full border border-green-400/40";

export function CorrectAnswerCelebration() {
    const reduceMotion = useReducedMotion();
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsVisible(false), HOLD_MS);
        return () => window.clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    // ARCHITECT: при выключенном движении остаётся статичный бейдж: смысл («верно») сохраняется,
    // а pulse, кольцо и затухание не показываются.
    if (reduceMotion) {
        return (
            <div
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                aria-hidden="true"
            >
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#141416]/90 px-6 py-5">
                    <span className={BADGE}>
                        <Check className="size-6" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <p className="text-sm text-[#f0f0f5]/80">Верно</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            aria-hidden="true"
        >
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 1, 0] }}
                transition={{ duration: HOLD_MS / 1000, times: [0, 0.6, 1], ease: "easeInOut" }}
                className="flex flex-col items-center gap-3 rounded-2xl bg-[#141416]/90 px-6 py-5"
            >
                <span className={BADGE}>
                    <motion.span
                        className={RING}
                        initial={{ opacity: 0.4, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.6 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                    <motion.span
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                    >
                        <Check className="size-6" strokeWidth={2} aria-hidden="true" />
                    </motion.span>
                </span>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
                    className="text-sm text-[#f0f0f5]/80"
                >
                    Верно
                </motion.p>
            </motion.div>
        </div>
    );
}