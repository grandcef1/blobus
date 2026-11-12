// ARCHITECT: один шаг демо-диалога. Реплики повторяют логику чата: репетитор слева, ученик справа
// инвертированной плашкой — формат урока читается сразу, без подписей авторов.
// ARCHITECT: появление шага — короткий fade/slide 200ms с respect к prefers-reduced-motion;
// декоративной анимации нет.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DemoStep as DemoStepData } from "@/api/mocks/demoLesson";

const EYEBROW = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";
const DETAIL = "mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3";

interface DemoStepProps {
    step: DemoStepData;
}

export function DemoStep({ step }: DemoStepProps) {
    const reduceMotion = useReducedMotion();
    const isUser = step.role === "user";

    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
                "max-w-[85%] rounded-2xl p-4",
                isUser
                    ? "self-end bg-[#f0f0f5] text-black"
                    : "self-start border border-white/5 bg-white/[0.04]"
            )}
        >
            <p className={cn("text-sm leading-relaxed", isUser ? "text-black" : "text-[#f0f0f5]/80")}>
                {step.text}
            </p>

            {step.correction && (
                <div className={DETAIL}>
                    <span className={EYEBROW}>Исправление</span>
                    <span className="text-sm text-[#f0f0f5]/40 line-through">
                        {step.correction.original}
                    </span>
                    <span className="text-sm text-[#f0f0f5]">{step.correction.corrected}</span>
                    <span className="text-xs text-[#f0f0f5]/50">{step.correction.rule}</span>
                    <span className="text-xs text-[#f0f0f5]/50">{step.correction.explanation}</span>
                </div>
            )}

            {step.vocabulary && (
                <div className={DETAIL}>
                    <span className={EYEBROW}>Лексика</span>
                    <span className="text-sm font-medium text-[#f0f0f5]">
                        {step.vocabulary.word}
                    </span>
                    <span className="text-xs text-[#f0f0f5]/50">{step.vocabulary.translation}</span>
                    <span className="text-xs text-[#f0f0f5]/50">{step.vocabulary.example}</span>
                </div>
            )}
        </motion.div>
    );
}
