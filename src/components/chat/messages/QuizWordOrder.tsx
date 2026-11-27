// ARCHITECT: викторина «собери предложение»: слова перемешаны, ученик набирает их в верхнюю строку нажатиями,
// а нажатие по слову в строке возвращает его назад. Проверка — по собранной строке на клиенте.
// ARCHITECT: исход проверки подтверждают поздравление и мягкий сигнал: верный — вверх, промах — вниз.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CorrectAnswerCelebration } from "@/components/shared/CorrectAnswerCelebration";
import { useCelebration } from "@/hooks/useCelebration";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import { QuizFeedback } from "./QuizFeedback";
import { normalizeAnswer } from "./quizCheck";

interface QuizWordOrderProps {
    readonly words: readonly string[];
    readonly answer: string;
    /** Исход первой проверки: повторение словаря по нему двигает шаг Лейтнера. */
    readonly onOutcome?: (correct: boolean) => void;
    /** Собранное предложение: уходит со следующим сообщением, верность сверяет сервер. */
    readonly onAnswer?: (answer: string) => void;
}

/** Слово с постоянным id: одинаковые слова не склеиваются, а порядок нажатий читается однозначно. */
interface Token {
    readonly id: number;
    readonly text: string;
}

type WordOrderResult = "correct" | "wrong" | null;

// ARCHITECT: перемешивание — один раз при монтировании карточки: порядок из ответа модели выдавал бы готовое
// предложение, а пересборка при каждом нажатии дёргала бы слова с места.
function shuffle(tokens: readonly Token[]): Token[] {
    const mixed = [...tokens];

    for (let index = mixed.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        const current = mixed[index];
        const other = mixed[swap];

        if (current === undefined || other === undefined) continue;

        mixed[index] = other;
        mixed[swap] = current;
    }

    return mixed;
}

const CHIP =
    "flex min-h-11 items-center rounded-xl border border-white/10 bg-[#141416] px-3 text-sm text-[#f0f0f5] transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:opacity-40";
const BUILD_LINE =
    "flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 p-2";
const CHECK_BUTTON =
    "flex min-h-11 w-fit items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:border-white/25 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:opacity-40";

export function QuizWordOrder({ words, answer, onOutcome, onAnswer }: QuizWordOrderProps) {
    const { t } = useTranslation("chat");
    const [pool, setPool] = useState<Token[]>(() =>
        shuffle(words.map((text, id) => ({ id, text })))
    );
    const [picked, setPicked] = useState<Token[]>([]);
    const [result, setResult] = useState<WordOrderResult>(null);
    const isSolved = result === "correct";
    const isCelebrating = useCelebration(isSolved);

    const pick = (token: Token): void => {
        if (isSolved) return;

        setPool((previous) => previous.filter((item) => item.id !== token.id));
        setPicked((previous) => [...previous, token]);
    };

    const drop = (token: Token): void => {
        if (isSolved) return;

        setPool((previous) => [...previous, token]);
        setPicked((previous) => previous.filter((item) => item.id !== token.id));
    };

    const check = (): void => {
        if (picked.length === 0 || isSolved) return;

        const sentence = picked.map((token) => token.text).join(" ");
        const outcome = normalizeAnswer(sentence) === normalizeAnswer(answer) ? "correct" : "wrong";

        // ARCHITECT: исход сообщается только по первой проверке: повторная сборка после промаха — это уже
        // попытка выучить ответ, а не чистый результат повторения. Серверу уходит последняя сборка (§16.2).
        if (result === null) onOutcome?.(outcome === "correct");

        onAnswer?.(sentence);
        setResult(outcome);
        playSound(outcome);
    };

    return (
        <div className="relative mt-4 flex flex-col gap-2">
            <div className={BUILD_LINE} aria-label={t("card.orderLabel")}>
                {picked.length === 0 ? (
                    <span className="text-xs text-[#f0f0f5]/25">{t("card.orderHint")}</span>
                ) : (
                    picked.map((token) => (
                        <button
                            key={token.id}
                            type="button"
                            onClick={() => drop(token)}
                            disabled={isSolved}
                            className={cn(CHIP, result === "wrong" && "border-red-400/40")}
                        >
                            {token.text}
                        </button>
                    ))
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {pool.map((token) => (
                    <button
                        key={token.id}
                        type="button"
                        onClick={() => pick(token)}
                        disabled={isSolved}
                        className={CHIP}
                    >
                        {token.text}
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={check}
                disabled={picked.length === 0 || isSolved}
                className={CHECK_BUTTON}
            >
                {t("card.check")}
            </button>

            <QuizFeedback
                text={
                    result === null
                        ? ""
                        : result === "correct"
                          ? t("card.correct")
                          : t("quiz.incorrect")
                }
                onRetry={result === "wrong" ? () => setResult(null) : undefined}
            />

            <CorrectAnswerCelebration show={isCelebrating} />
        </div>
    );
}
