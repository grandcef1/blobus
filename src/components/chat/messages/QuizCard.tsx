// ARCHITECT: викторина — минимальная карточка: eyebrow, вопрос, опции-строки. Цвет остался там, где
// он что-то значит — верный и неверный ответ.
// ARCHITECT: поверхность холодная индиго и базовый фон опции как у обычного сообщения (решения
// владельца): викторина не путается с золотистой карточкой исправления, а опции читаются как
// элементы управления, а не как часть тонированного фона.
// ARCHITECT: поздравление показывается здесь же, внутри карточки, и только по свежему верному
// ответу: состояние стартует false и ставится в обработчике выбора, поэтому повторный вход в чат
// анимацию не запускает.
// ARCHITECT: верный вариант открывается после двух промахов подряд: с первого промаха пользователь
// пробует сам, а не читает ответ. «Заново» промахи не отменяет — иначе второй промах снова был бы
// первым, и ответ не открылся бы никогда.

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { EnhancedChatSession, QuizContent, QuizOption } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { cn } from "@/lib/utils";
import { QuizFeedback } from "./QuizFeedback";

interface QuizCardProps {
    quiz?: QuizContent;
    session: EnhancedChatSession;
}

const LETTERS = ["А", "Б", "В", "Г"];
const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";
/** Сколько промахов подряд открывают верный вариант. */
const REVEAL_AFTER_WRONG = 2;
/** Полный срок поздравления: короткий импульс, а не экран. */
const CELEBRATION_MS = 1100;
const CELEBRATION_REDUCED_MS = 700;

export function QuizCard({ quiz, session }: QuizCardProps) {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);
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
            return `Верный ответ — «${correctOption?.text}». ${correctOption?.explanation ?? ""}`.trim();
        }

        return "Неверно. Попробуйте снова.";
    };

    const handleSelect = (optionId: string) => {
        if (isSolved) return;

        setSelectedOptionId(optionId);

        if (correctOption?.id === optionId) {
            setIsCelebrating(true);
            return;
        }

        setWrongAttempts((previous) => previous + 1);
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
