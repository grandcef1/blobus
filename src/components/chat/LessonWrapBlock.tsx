// ARCHITECT: блок итогового хода: слова урока со статусами рисует клиент по данным сервера — до этого хода
// списка слов у него нет вовсе, поэтому подсказать урок ими нельзя (§16.6). Подводку пишет модель, здесь список
// и статус: статус показан словом и тонким маркером, а не цветной заливкой (§3.1, §12).

import { useTranslation } from "react-i18next";
import type { ChatWordView } from "@/api/chat";

interface LessonWrapBlockProps {
    readonly words: readonly ChatWordView[];
}

const ROW =
    "flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0";
const EYEBROW = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";

export function LessonWrapBlock({ words }: LessonWrapBlockProps) {
    const { t } = useTranslation("chat");

    if (words.length === 0) return null;

    return (
        <section
            aria-label={t("wrap.title")}
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] p-4 md:max-w-[min(85%,70ch)]"
        >
            <p className={EYEBROW}>{t("wrap.title")}</p>

            <ul className="mt-3 flex flex-col gap-2">
                {words.map((word) => (
                    <li key={word.word} className={ROW}>
                        <span className="text-sm text-[#f0f0f5]">{word.word}</span>
                        <span className="ml-auto text-xs text-[#f0f0f5]/50">{word.meaning}</span>
                        <span className="shrink-0 text-[11px] text-[#f0f0f5]/40">
                            {t(`wrap.status.${word.status}`)}
                        </span>
                    </li>
                ))}
            </ul>

            <p className="mt-3 text-[11px] text-[#f0f0f5]/40">{t("wrap.dictionary")}</p>
        </section>
    );
}
