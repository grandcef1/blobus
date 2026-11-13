// ARCHITECT: один вопрос теста. Конфетти и цветных заливок нет: тест — спокойное измерение, а не
// викторина, поэтому после ответа показывается только тонкая отметка верного варианта и разбор.
// ARCHITECT: разметка одна на все предметы теста, поэтому опции берутся из общего QuizOptionButton.
// ARCHITECT: разбор раскрывается по высоте (height 0 -> auto) вместе с прозрачностью: без этого
// блок под опциями прыгал на строку разбора в момент ответа.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PlacementItem } from "@/types/placement";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { StepCard } from "@/components/onboarding/StepCard";

interface PlacementQuestionProps {
    item: PlacementItem;
    number: number;
    total: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
}

const MARKERS = ["1", "2", "3", "4"];
const REVEAL_DURATION = 0.22;

export function PlacementQuestion({
    item,
    number,
    total,
    selectedOptionId,
    onSelect,
}: PlacementQuestionProps) {
    const shouldReduceMotion = useReducedMotion();
    const isAnswered = selectedOptionId !== null;

    const stateFor = (optionId: string): QuizOptionState => {
        if (!isAnswered) return "idle";
        if (optionId === item.correctOptionId) return "correct";
        return optionId === selectedOptionId ? "wrong" : "dimmed";
    };

    return (
        <StepCard>
            {/* ARCHITECT: live-регион вокруг вопроса целиком: после ответа меняются и разметка опций,
                и разбор, поэтому скринридер должен получить обновление блока, а не одной строки. */}
            <div aria-live="polite">
                <p className="text-xs tabular-nums text-[#f0f0f5]/50">
                    Вопрос {number} из {total}
                </p>

                <p className="mt-4 text-base leading-[1.6] text-[#f0f0f5] md:text-lg">{item.prompt}</p>

                <div className="mt-5 flex flex-col gap-2" role="group" aria-label="Варианты ответа">
                    {item.options.map((option, index) => (
                        <QuizOptionButton
                            key={option.id}
                            marker={MARKERS[index] ?? ""}
                            text={option.text}
                            state={stateFor(option.id)}
                            disabled={isAnswered}
                            onSelect={() => onSelect(option.id)}
                        />
                    ))}
                </div>

                <AnimatePresence initial={false}>
                    {isAnswered && item.explanation && (
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{
                                duration: shouldReduceMotion ? 0 : REVEAL_DURATION,
                                ease: "easeOut",
                            }}
                            className="overflow-hidden"
                        >
                            <p className="mt-4 text-xs leading-[1.6] text-[#f0f0f5]/60">
                                {item.explanation}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </StepCard>
    );
}