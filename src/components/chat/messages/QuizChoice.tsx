// ARCHITECT: викторина с выбором варианта: проверка на клиенте, как и у примеров-сессий — верный ответ входит
// в карточку. Опции рисует общий QuizOptionButton, состояние считает эта карточка.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatQuizOption } from "@/api/chat";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { LETTERS_KEYS } from "./quizConstants";
import { QuizFeedback } from "./QuizFeedback";

interface QuizChoiceProps {
    readonly options: readonly ChatQuizOption[];
    readonly answerId: string;
}

export function QuizChoice({ options, answerId }: QuizChoiceProps) {
    const { t } = useTranslation("chat");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const isAnswered = selectedId !== null;
    const isCorrect = selectedId === answerId;

    const stateFor = (option: ChatQuizOption): QuizOptionState => {
        if (!isAnswered) return "idle";
        if (option.id === selectedId) return option.id === answerId ? "correct" : "wrong";

        return "dimmed";
    };

    return (
        <div className="mt-4 flex flex-col gap-2" role="group" aria-label={t("quiz.optionsLabel")}>
            {options.map((option, index) => {
                const letterKey = LETTERS_KEYS[index];

                return (
                    <QuizOptionButton
                        key={option.id}
                        marker={letterKey ? t(letterKey) : ""}
                        text={option.text}
                        state={stateFor(option)}
                        disabled={isAnswered}
                        onSelect={() => setSelectedId(option.id)}
                    />
                );
            })}

            <QuizFeedback
                text={isAnswered ? (isCorrect ? t("card.correct") : t("quiz.incorrect")) : ""}
                onRetry={isAnswered && !isCorrect ? () => setSelectedId(null) : undefined}
            />
        </div>
    );
}
