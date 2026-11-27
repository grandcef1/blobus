// ARCHITECT: повторение — викторина по слову: задание приходит с сервера (GET /api/vocabulary/review) готовым, а
// проверка идёт на клиенте виджетами чата, поэтому звук и поздравление здесь те же, что в C-7 (§5.4: один виджет
// на один тип задания). Очередь снимается на входе в режим, а ответ записывается сразу — переход делает ученик.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatQuiz } from "@/api/chat";
import type { ReviewOutcome, ReviewQueueItemDto } from "@/api/progress";
import { QuizChoice } from "@/components/chat/messages/QuizChoice";
import { QuizGapFill } from "@/components/chat/messages/QuizGapFill";
import { QuizWordOrder } from "@/components/chat/messages/QuizWordOrder";
import { Skeleton } from "@/components/ui/skeleton";

interface VocabularyReviewProps {
    readonly queue: readonly ReviewQueueItemDto[];
    readonly isLoading: boolean;
    readonly onReviewed: (id: string, outcome: ReviewOutcome) => Promise<void>;
    readonly onExit: () => void;
}

/** Верный ответ задания: его показывают после первой попытки — на промахе это и есть урок. */
function taskAnswer(task: ChatQuiz): string {
    if (task.type === "choice")
        return task.options.find((option) => option.id === task.answerId)?.text ?? task.answerId;

    return task.answer;
}

export function VocabularyReview({ queue, isLoading, onReviewed, onExit }: VocabularyReviewProps) {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const [index, setIndex] = useState(0);
    const [outcome, setOutcome] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);

    const current = queue[index];
    // ARCHITECT: прогресс сессии — число оставшихся слов: счётчик уменьшается с каждым ответом.
    const remaining = Math.max(0, queue.length - index);

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-[#111113] p-4" aria-busy="true">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (current === undefined) {
        return (
            <div className="rounded-2xl bg-[#111113] p-6 text-center">
                <p className="text-sm text-[#f0f0f5]/70">{t("vocabulary.review.done")}</p>
                <button
                    type="button"
                    onClick={onExit}
                    className="mt-4 rounded-xl bg-[#f0f0f5] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90"
                >
                    {tCommon("actions.close")}
                </button>
            </div>
        );
    }

    // ARCHITECT: исход пишется сразу по первой попытке: ученик может закрыть повторение, не досмотрев, и слово не
    // должно потерять свой шаг Лейтнера. Сбой записи не прячет верный ответ — он уходит тостом в странице.
    const handleOutcome = (correct: boolean): void => {
        if (outcome !== null || busy) return;

        setOutcome(correct);
        setBusy(true);
        void onReviewed(current.id, correct ? "remembered" : "forgotten").finally(() =>
            setBusy(false)
        );
    };

    const next = (): void => {
        setOutcome(null);
        setIndex((value) => value + 1);
    };

    return (
        <div className="rounded-2xl bg-[#111113] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs tabular-nums text-[#f0f0f5]/50">
                    {t("vocabulary.review.due", { count: remaining })}
                </p>
                <button
                    type="button"
                    onClick={onExit}
                    className="text-xs text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]/80"
                >
                    {tCommon("actions.close")}
                </button>
            </div>

            <article className="rounded-xl bg-[#141416] p-4">
                <p className="text-[11px] uppercase tracking-wider text-[#f0f0f5]/40">
                    {t("vocabulary.review.label")}
                </p>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#f0f0f5]/90">
                    {current.task.prompt}
                </p>

                {current.task.type === "choice" && (
                    <QuizChoice
                        options={current.task.options}
                        answerId={current.task.answerId}
                        onOutcome={handleOutcome}
                    />
                )}
                {current.task.type === "gap-fill" && (
                    <QuizGapFill answer={current.task.answer} onOutcome={handleOutcome} />
                )}
                {current.task.type === "word-order" && (
                    <QuizWordOrder
                        words={current.task.words}
                        answer={current.task.answer}
                        onOutcome={handleOutcome}
                    />
                )}

                {outcome !== null && (
                    <p className="mt-3 border-t border-white/5 pt-3 text-sm text-[#f0f0f5]/70">
                        {t("vocabulary.review.answer", { answer: taskAnswer(current.task) })}
                    </p>
                )}
            </article>

            {outcome !== null && (
                <button
                    type="button"
                    onClick={next}
                    disabled={busy}
                    className="mt-3 w-full rounded-xl bg-[#f0f0f5] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 disabled:opacity-40"
                >
                    {t("vocabulary.review.next")}
                </button>
            )}
        </div>
    );
}

