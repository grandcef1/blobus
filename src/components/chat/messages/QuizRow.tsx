// ARCHITECT: карточка викторины из реального ответа: оболочка одна, а тело выбирает тип — gap-fill, choice или
// word-order. Проверку делает клиент: верный ответ входит в карточку, у модели нет инструментов проверки (§16.8).
// ARCHITECT: выбранный ответ клиент отдаёт наверх: он уходит со следующим сообщением, а верность сверяет сервер
// по сохранённой карточке — метрики урока и статусы слов считает он, а не интерфейс (§16.2).

import { useTranslation } from "react-i18next";
import type { ChatQuiz } from "@/api/chat";
import { QuizChoice } from "./QuizChoice";
import { QuizGapFill } from "./QuizGapFill";
import { QuizWordOrder } from "./QuizWordOrder";

interface QuizRowProps {
    readonly quiz: ChatQuiz | null;
    /** Ответ ученика: уходит со следующим сообщением, сервер сверяет его сам. */
    readonly onAnswer?: (answer: string) => void;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-indigo-300/70";

export function QuizRow({ quiz, onAnswer }: QuizRowProps) {
    const { t } = useTranslation("chat");

    if (quiz === null) return null;

    return (
        <div className="w-full rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("quiz.title")}</p>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base">
                {quiz.prompt}
            </p>

            {quiz.type === "choice" && (
                <QuizChoice options={quiz.options} answerId={quiz.answerId} onAnswer={onAnswer} />
            )}
            {quiz.type === "gap-fill" && <QuizGapFill answer={quiz.answer} onAnswer={onAnswer} />}
            {quiz.type === "word-order" && (
                <QuizWordOrder words={quiz.words} answer={quiz.answer} onAnswer={onAnswer} />
            )}
        </div>
    );
}
