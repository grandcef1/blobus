// ARCHITECT: викторина с выбором варианта: проверка на клиенте, как и у примеров-сессий — верный ответ входит
// в карточку. Опции рисует общий QuizOptionButton, состояние считает эта карточка.
// ARCHITECT: верный ответ подтверждают поздравление и мягкий сигнал, промах — сигнал промаха без
// поздравления: ответ остаётся закрытым, пока ученик не попробует сам.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatQuizOption } from "@/api/chat";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { useCelebration } from "@/hooks/useCelebration";
import { playSound } from "@/lib/sounds";
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
    const isCelebrating = useCelebration(isCorrect);

    const select = (optionId: string): void => {
        setSelectedId(optionId);
        playSound(optionId === answerId ? "correct" : "wrong");
    };

    const stateFor = (option: ChatQuizOption): QuizOptionState => {
        if (!isAnswered) return "idle";
        if (option.id === selectedId) return option.id === answerId ? "correct" : "wrong";

        return "dimmed";
    };

    return (
        <div
            className="relative mt-4 flex flex-col gap-2"
            role="group"
            aria-label={t("quiz.optionsLabel")}
        >
            {options.map((option, index) => {
                const letterKey = LETTERS_KEYS[index];

                return (
                    <QuizOptionButton
                        key={option.id}
                        marker={letterKey ? t(letterKey) : ""}
                        text={option.text}
                        state={stateFor(option)}
                        disabled={isAnswered}
                        onSelect={() => select(option.id)}
                    />
                );
            })}

            <QuizFeedback
                text={isAnswered ? (isCorrect ? t("card.correct") : t("quiz.incorrect")) : ""}
                onRetry={isAnswered && !isCorrect ? () => setSelectedId(null) : undefined}
            />

            <CorrectAnswerCelebration show={isCelebrating} />
        </div>
    );
}
