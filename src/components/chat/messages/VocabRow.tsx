// ARCHITECT: карточка слова из реального ответа: термин, перевод и предложение урока. Часть речи, транскрипции
// и похожих слов в серверном карточке нет — интерфейс их не выдумывает, а показывает то, что пришло.

import { useTranslation } from "react-i18next";
import type { ChatVocabWord } from "@/api/chat";

interface VocabRowProps {
    readonly word: ChatVocabWord | null;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";

export function VocabRow({ word }: VocabRowProps) {
    const { t } = useTranslation("chat");

    if (word === null) return null;

    return (
        <div className="w-full rounded-xl border border-white/5 bg-white/[0.02] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("vocabularyCard.newWord")}</p>
            <h3 className="mt-2 text-xl font-semibold text-[#f0f0f5]">{word.term}</h3>

            {word.translation !== "" && (
                <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/70">{word.translation}</p>
            )}

            {word.context !== "" && (
                <div className="mt-4 border-t border-white/5 pt-3">
                    <p className={EYEBROW}>{t("vocabularyCard.context")}</p>
                    <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/80">{word.context}</p>
                </div>
            )}
        </div>
    );
}
