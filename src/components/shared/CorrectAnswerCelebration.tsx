// ARCHITECT: поздравление живёт внутри карточки викторины: оверлей на весь чат срабатывал в каждом
// чате и при повторном входе, поэтому область — блок викторины, а показом распоряжается карточка.
// ARCHITECT: компонент чистый: таймер и состояние держит QuizCard, здесь только разметка и анимация
// входа. При reduced-motion остаётся статичный бейдж без кольца и пружины.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

interface CorrectAnswerCelebrationProps {
    /** Показывать ли поздравление: карточка викторины снимает его сама по таймеру. */
    show: boolean;
}

const BADGE =
    "relative flex size-10 items-center justify-center rounded-full border border-green-400/40 bg-green-500/10 text-green-400";
const RING = "absolute inset-0 rounded-full border border-green-400/40";

export function CorrectAnswerCelebration({ show }: CorrectAnswerCelebrationProps) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
                    aria-hidden="true"
                >
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#141416]/90 px-4 py-3">
                        <span className={BADGE}>
                            {!shouldReduceMotion && (
                                <motion.span
                                    className={RING}
                                    initial={{ opacity: 0.4, scale: 1 }}
                                    animate={{ opacity: 0, scale: 1.6 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                            )}
                            <motion.span
                                initial={shouldReduceMotion ? false : { scale: 0.6 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                            >
                                <Check className="size-5" strokeWidth={2} aria-hidden="true" />
                            </motion.span>
                        </span>

                        <p className="text-xs text-[#f0f0f5]/80">Верно</p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}