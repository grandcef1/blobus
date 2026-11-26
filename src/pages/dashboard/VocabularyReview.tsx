// ARCHITECT: режим повторения не ходит в сеть сам: он листает переданную очередь и отдаёт решение
// родителю, который пишет результат и инвалидирует кэш. Очередь снимается на входе: иначе перезапрос
// после ответа сократил бы due и следующая карточка перескочила бы.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { VocabularyCardModel } from "./VocabularyEntryCard";

interface VocabularyReviewProps {
    readonly due: VocabularyCardModel[];
    readonly onReviewed: (id: string, reviewed: "remembered" | "forgotten") => Promise<void>;
    readonly onExit: () => void;
}

export function VocabularyReview({ due, onReviewed, onExit }: VocabularyReviewProps) {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const [queue] = useState(due);
    const [index, setIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [busy, setBusy] = useState(false);

    const current = queue[index];

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

    const review = async (reviewed: "remembered" | "forgotten") => {
        if (busy) return;
        setBusy(true);
        try {
            await onReviewed(current.id, reviewed);
            setIndex((value) => value + 1);
            setShowAnswer(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-2xl bg-[#111113] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs tabular-nums text-[#f0f0f5]/50">
                    {t("vocabulary.review.due", { count: queue.length - index })}
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
                <h3 className="text-base font-medium text-[#f0f0f5]">{current.term}</h3>
                {current.example !== null && (
                    <p className="mt-1 text-xs italic text-[#f0f0f5]/50">{current.example}</p>
                )}
                {showAnswer && (
                    <div className="mt-3 border-t border-white/5 pt-3">
                        {current.translation !== null && (
                            <p className="text-sm text-[#f0f0f5]/70">{current.translation}</p>
                        )}
                        {current.exampleTranslation !== null && (
                            <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                {current.exampleTranslation}
                            </p>
                        )}
                    </div>
                )}
            </article>

            <div className="mt-3 flex gap-2">
                {showAnswer ? (
                    <>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void review("remembered")}
                            className="flex-1 rounded-xl bg-[#f0f0f5] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 disabled:opacity-40"
                        >
                            {t("vocabulary.review.remember")}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void review("forgotten")}
                            className="flex-1 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-[#f0f0f5]/80 transition-colors hover:bg-white/5 disabled:opacity-40"
                        >
                            {t("vocabulary.review.forget")}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowAnswer(true)}
                        className="flex-1 rounded-xl bg-[#f0f0f5] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90"
                    >
                        {t("vocabulary.review.showAnswer")}
                    </button>
                )}
            </div>
        </div>
    );
}
