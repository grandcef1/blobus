// ARCHITECT: карточка викторины из реального ответа: оболочка одна, а тело выбирает тип — gap-fill, choice или
// word-order. Проверку делает клиент: верный ответ входит в карточку, у модели нет инструментов проверки (§16.8).

import { useTranslation } from "react-i18next";
import type { ChatQuiz } from "@/api/chat";
import { QuizChoice } from "./QuizChoice";
import { QuizGapFill } from "./QuizGapFill";
import { QuizWordOrder } from "./QuizWordOrder";

interface QuizRowProps {
    readonly quiz: ChatQuiz | null;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-indigo-300/70";

export function QuizRow({ quiz }: QuizRowProps) {
    const { t } = useTranslation("chat");

    if (quiz === null) return null;

    return (
        <div className="w-full rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("quiz.title")}</p>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base">
                {quiz.prompt}
            </p>

            {quiz.type === "choice" && (
                <QuizChoice options={quiz.options} answerId={quiz.answerId} />
            )}
            {quiz.type === "gap-fill" && <QuizGapFill answer={quiz.answer} />}
            {quiz.type === "word-order" && (
                <QuizWordOrder words={quiz.words} answer={quiz.answer} />
            )}
        </div>
    );
}
