// ARCHITECT: закрытое задание: ответ уже дан, повторное прохождение невозможно (§спец. 9). Кнопок здесь нет
// вовсе, а выбранный и верный вариант показаны отдельными подложками светлее карточки; цвет продублирован
// начертанием — зачёркиванием промаха и жирным верного варианта (§8.2).
// ARCHITECT: на верный ответ обе строки не дублируются: выбранное и есть верное, поэтому строка одна.

import { useTranslation } from "react-i18next";
import type { ChatQuiz, ChatQuizState } from "@/api/chat";
import { answerTextFor, correctAnswerText } from "./quizCheck";

interface QuizLockedStateProps {
    readonly quiz: ChatQuiz;
    readonly state: ChatQuizState;
}

const ROW = "rounded-lg bg-[#1a1a1c] px-3 py-2.5";
const LABEL = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";
const SELECTED = "mt-1 text-sm leading-[1.6] text-red-300 line-through decoration-red-400/50";
const CORRECT = "mt-1 text-sm font-semibold leading-[1.6] text-emerald-300";

export function QuizLockedState({ quiz, state }: QuizLockedStateProps) {
    const { t } = useTranslation("chat");
    const right = correctAnswerText(quiz);
    // ARCHITECT: у выбора в payload лежит id опции, а не текст: ученику показывается вариант словами.
    const selected = state.selected === null ? null : answerTextFor(quiz, state.selected);

    return (
        <div className="mt-4 flex flex-col gap-2" aria-live="polite">
            {!state.correct && selected !== null && (
                <div className={ROW}>
                    <p className={LABEL}>{t("quiz.yourAnswer")}</p>
                    <p className={SELECTED}>{selected}</p>
                </div>
            )}

            {right !== "" && (
                <div className={ROW}>
                    <p className={LABEL}>{t("quiz.rightAnswer")}</p>
                    <p className={CORRECT}>{right}</p>
                </div>
            )}
        </div>
    );
}
