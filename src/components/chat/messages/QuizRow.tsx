// ARCHITECT: карточка задания из реального ответа: оболочка одна, а тело выбирает тип — gap-fill, choice или
// word-order; тип приходит от сервера, поэтому форма ответа всегда та же, что ждёт сервер.
// ARCHITECT: выбранный ответ уходит наверх отдельным вызовом /chat/quiz-answer: верность сверяет сервер по
// сохранённой карточке (метрики урока и статусы слов считает он, а не интерфейс, §16.2).
// ARCHITECT: закрытое задание (state.answered) телом не рисуется: показывается ответ, кнопок нет (§спец. 9).

import { useTranslation } from "react-i18next";
import type { ChatQuiz, ChatQuizState } from "@/api/chat";
import { QuizChoice } from "./QuizChoice";
import { QuizGapFill } from "./QuizGapFill";
import { QuizLockedState } from "./QuizLockedState";
import { QuizWordOrder } from "./QuizWordOrder";

interface QuizRowProps {
    readonly quiz: ChatQuiz | null;
    /** Состояние задания из payload: ответ дан — карточка заблокирована и переживает перезагрузку. */
    readonly state?: ChatQuizState | null;
    /** Выбор ученика: уходит на сервер отдельным вызовом, верность решает он. */
    readonly onAnswer?: (answer: string) => void;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-indigo-300/70";

export function QuizRow({ quiz, state = null, onAnswer }: QuizRowProps) {
    const { t } = useTranslation("chat");

    if (quiz === null) return null;

    const locked = state !== null && state.answered;

    return (
        <div className="w-full rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("quiz.title")}</p>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base">
                {quiz.prompt}
            </p>

            {locked ? (
                <QuizLockedState quiz={quiz} state={state} />
            ) : (
                <>
                    {quiz.type === "choice" && (
                        <QuizChoice
                            options={quiz.options}
                            answerId={quiz.answerId}
                            onAnswer={onAnswer}
                        />
                    )}
                    {quiz.type === "gap-fill" && (
                        <QuizGapFill answer={quiz.answer} onAnswer={onAnswer} />
                    )}
                    {quiz.type === "word-order" && (
                        <QuizWordOrder words={quiz.words} answer={quiz.answer} onAnswer={onAnswer} />
                    )}
                </>
            )}
        </div>
    );
}
