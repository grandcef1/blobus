// ARCHITECT: строка разбора под опциями викторины — текст обратной связи и повторная попытка.
// Вынесена из карточки: правила показа (когда открывается верный вариант) остались у викторины, а
// разметка одного блока живёт отдельно.
// ARCHITECT: live-регион держится на постоянном контейнере без отступов: если бы регион монтировался
// вместе с текстом, скринридер мог его не объявить, а пустой отступ под опциями ломал бы раскладку.

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

interface QuizFeedbackProps {
    /** Пустая строка — блока нет: викторина ещё не отвечена. */
    text: string;
    /** Повторная попытка: нет, когда ответ уже открыт или дан верно. */
    onRetry?: () => void;
}

const RETRY_BUTTON =
    "flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] text-[#f0f0f5]/50 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function QuizFeedback({ text, onRetry }: QuizFeedbackProps) {
    return (
        <div aria-live="polite">
            <AnimatePresence initial={false}>
                {text !== "" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="mt-4 flex items-start justify-between gap-3"
                    >
                        <p className="text-xs leading-[1.6] text-[#f0f0f5]/60">{text}</p>

                        {onRetry && (
                            <button type="button" onClick={onRetry} className={RETRY_BUTTON}>
                                <RotateCcw className="size-3" aria-hidden="true" />
                                Заново
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}