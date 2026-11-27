// ARCHITECT: викторина — минимальная карточка: eyebrow, вопрос, опции-строки. Цвет остался там, где
// он что-то значит — верный и неверный ответ.
// ARCHITECT: поверхность холодная индиго и базовый фон опции как у обычного сообщения (решения
// владельца): викторина не путается с золотистой карточкой исправления, а опции читаются как
// элементы управления, а не как часть тонированного фона.
// ARCHITECT: поздравление показывается здесь же, внутри карточки, и только по свежему верному ответу:
// показом распоряжается useCelebration по верному выбору, поэтому повторный вход в чат анимацию не запускает.
// ARCHITECT: верный вариант открывается после двух промахов подряд: с первого промаха пользователь
// пробует сам, а не читает ответ. «Заново» промахи не отменяет — иначе второй промах снова был бы
// первым, и ответ не открылся бы никогда.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EnhancedChatSession, QuizContent, QuizOption } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { useCelebration } from "@/hooks/useCelebration";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { QuizFeedback } from "./QuizFeedback";
import { AUTHOR_NAME, LETTERS_KEYS, REVEAL_AFTER_WRONG } from "./quizConstants";

interface QuizCardProps {
    quiz?: QuizContent;
    session: EnhancedChatSession;
}

export function QuizCard({ quiz, session }: QuizCardProps) {
    const { t } = useTranslation("chat");
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const repetitor = getBlobatarById(session.repetitorId);

    // ARCHITECT: хук стоит до раннего выхода — порядок хуков не зависит от того, пришла ли викторина, а
    // поздравление это производное от выбора, а не отдельное состояние карточки.
    const correctOption = quiz?.options.find((option) => option.isCorrect);
    const isCorrect = selectedOptionId !== null && correctOption?.id === selectedOptionId;
    const isCelebrating = useCelebration(isCorrect);

    if (!quiz) return null;

    const isSolved = selectedOptionId !== null;
    const isRevealed = isSolved && !isCorrect && wrongAttempts >= REVEAL_AFTER_WRONG;
    // ARCHITECT: после открытия ответа повторная попытка теряет смысл: верный вариант уже подсвечен,
    // а «Заново» снимало бы подсветку и начинало бы викторину заново.
    const canRetry = isSolved && !isCorrect && !isRevealed;

    // ARCHITECT: текст зависит от исхода. На первом промахе разбор выбранной опции не показывается:
    // он иногда подсказывает верную формулировку, и ответ открывался бы раньше положенного.
    const buildFeedback = (): string => {
        if (!isSolved) return "";
        if (isCorrect) return correctOption?.explanation ?? "";
        if (isRevealed) {
            return t("quiz.correctAnswer", {
                answer: correctOption?.text ?? "",
                explanation: correctOption?.explanation ?? "",
            }).trim();
        }

        return t("quiz.incorrect");
    };

    const handleSelect = (optionId: string) => {
        if (isSolved) return;

        setSelectedOptionId(optionId);
        playSound(correctOption?.id === optionId ? "correct" : "wrong");

        // ARCHITECT: поздравление поднимает сам хук по верному выбору, поэтому здесь растёт только счётчик
        // промахов — по нему открывается верный вариант.
        if (correctOption?.id !== optionId) setWrongAttempts((previous) => previous + 1);
    };

    const stateFor = (option: QuizOption): QuizOptionState => {
        if (!isSolved) return "idle";
        if (option.id === selectedOptionId) return option.isCorrect ? "correct" : "wrong";
        // ARCHITECT: до открытия ответа невыбранные опции выглядят одинаково приглушённо, поэтому
        // подсветка не подсказывает, какой вариант верный.
        if (option.isCorrect && isRevealed) return "correct";

        return "dimmed";
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
                            {t("quiz.title")}
                        </p>
                        <p className="mt-3 text-[15px] leading-[1.6] text-[#f0f0f5]/90 md:text-base">
                            {quiz.question}
                        </p>

                        <div
                            className="mt-4 flex flex-col gap-2"
                            role="group"
                            aria-label={t("quiz.optionsLabel")}
                        >
                            {quiz.options.map((option, index) => {
                                const letterKey = LETTERS_KEYS[index];
                                return (
                                    <QuizOptionButton
                                        key={option.id}
                                        marker={letterKey ? t(letterKey) : ""}
                                        text={option.text}
                                        state={stateFor(option)}
                                        disabled={isSolved}
                                        onSelect={() => handleSelect(option.id)}
                                    />
                                );
                            })}
                        </div>

                        <QuizFeedback
                            text={buildFeedback()}
                            onRetry={canRetry ? () => setSelectedOptionId(null) : undefined}
                        />
                    </div>

                    <CorrectAnswerCelebration show={isCelebrating} />
                </div>
            </div>
        </div>
    );
}
