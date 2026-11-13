// ARCHITECT: викторина — минимальная карточка: eyebrow, вопрос, опции-строки. Цветной плашки,
// бейджа времени и буквенных кружков больше нет: цвет остался там, где он что-то значит —
// верный и неверный ответ.
// ARCHITECT: поверхность холодная индиго — решение владельца: викторина отличается и от ленты, и
// от золотистой карточки исправления, поэтому два вида интерактива не путаются между собой.
// ARCHITECT: опции отвечают цветом обычного сообщения (#141416): тонировка карточки к ним не
// переходит, иначе выбор читался бы как часть фона.
// ARCHITECT: поздравление показывается здесь же, внутри карточки, и только по свежему верному
// ответу: состояние стартует false и ставится в обработчике выбора, поэтому повторный вход в чат
// анимацию не запускает.
// ARCHITECT: «Заново» показывается только после неверного ответа: при верном выбор фиксируется.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { EnhancedChatSession, QuizContent, QuizOption } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { cn } from "@/lib/utils";

interface QuizCardProps {
    quiz?: QuizContent;
    session: EnhancedChatSession;
}

const LETTERS = ["А", "Б", "В", "Г"];
const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";
/** Полный срок поздравления: короткий импульс, а не экран. */
const CELEBRATION_MS = 1100;
const CELEBRATION_REDUCED_MS = 700;

export function QuizCard({ quiz, session }: QuizCardProps) {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [isCelebrating, setIsCelebrating] = useState(false);
    const shouldReduceMotion = useReducedMotion();
    const repetitor = getBlobatarById(session.repetitorId);

    // ARCHITECT: поздравление снимает таймер, а не анимация: он чистится вместе с размонтированием
    // карточки, поэтому уход из чата не оставляет за собой живой таймер.
    useEffect(() => {
        if (!isCelebrating) return;

        const timer = window.setTimeout(
            () => setIsCelebrating(false),
            shouldReduceMotion ? CELEBRATION_REDUCED_MS : CELEBRATION_MS
        );

        return () => window.clearTimeout(timer);
    }, [isCelebrating, shouldReduceMotion]);

    if (!quiz) return null;

    const correctOption = quiz.options.find((option) => option.isCorrect);
    const isSolved = selectedOptionId !== null;
    const isCorrect = isSolved && correctOption?.id === selectedOptionId;

    // ARCHITECT: разбор берётся у выбранной опции, а при верном ответе — у верной: объяснение
    // своего неверного выбора после правильного ответа только путало бы.
    const explanation =
        quiz.options.find((option) => option.id === selectedOptionId)?.explanation ??
        correctOption?.explanation;

    const handleSelect = (optionId: string) => {
        if (isSolved) return;

        setSelectedOptionId(optionId);
        if (correctOption?.id === optionId) setIsCelebrating(true);
    };

    const stateFor = (option: QuizOption): QuizOptionState => {
        if (!isSolved) return "idle";
        if (option.isCorrect) return "correct";
        return option.id === selectedOptionId ? "wrong" : "dimmed";
    };

    return (
        <div className="flex items-start gap-3">
            <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            <div className="min-w-0 flex-1">
                {repetitor && <p className={AUTHOR_NAME}>{repetitor.name}</p>}

                <div className="relative w-full md:max-w-[min(85%,70ch)]">
                    {/* ARCHITECT: на время поздравления контент карточки слегка блюрится: внимание у
                        бейджа, а текст и опции остаются на месте и не смещают раскладку. */}
                    <div
                        className={cn(
                            "overflow-hidden rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4 transition-[filter] duration-200",
                            isCelebrating && "blur-[2px]"
                        )}
                    >
                        <p className="text-[11px] uppercase tracking-wider text-indigo-300/70">
                            Викторина
                        </p>
                        <p className="mt-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base">
                            {quiz.question}
                        </p>

                        <div className="mt-4 flex flex-col gap-2" role="group" aria-label="Варианты ответа">
                            {quiz.options.map((option, index) => (
                                <QuizOptionButton
                                    key={option.id}
                                    marker={LETTERS[index] ?? ""}
                                    text={option.text}
                                    state={stateFor(option)}
                                    disabled={isSolved}
                                    onSelect={() => handleSelect(option.id)}
                                />
                            ))}
                        </div>

                        <AnimatePresence initial={false}>
                            {isSolved && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="mt-4 flex items-start justify-between gap-3"
                                >
                                    <p className="text-xs leading-[1.6] text-[#f0f0f5]/60">
                                        {explanation}
                                    </p>

                                    {!isCorrect && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedOptionId(null)}
                                            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] text-[#f0f0f5]/50 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                                        >
                                            <RotateCcw className="size-3" aria-hidden="true" />
                                            Заново
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <CorrectAnswerCelebration show={isCelebrating} />
                </div>
            </div>
        </div>
    );
}

