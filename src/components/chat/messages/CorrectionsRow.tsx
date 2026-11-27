// ARCHITECT: карточка разбора правки: янтарная поверхность, как у CorrectionView в примерах-сессиях, а
// внутри та же пара цветов: ошибочный фрагмент красным зачёркнут, исправленный вариант зелёным — цвет
// здесь значимое состояние, а не украшение (§3.3).
// ARCHITECT: модель присылает исправленный вариант и правило одной строкой rule (server/chat/prompt.ts),
// поэтому исходник здесь не выдумывается: красный фрагмент берётся дословно из реплики ученика.

import { useTranslation } from "react-i18next";
import type { ChatCorrection } from "@/api/chat";

interface CorrectionsRowProps {
    readonly corrections: readonly ChatCorrection[];
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-amber-300/70";

export function CorrectionsRow({ corrections }: CorrectionsRowProps) {
    const { t } = useTranslation("common");

    if (corrections.length === 0) return null;

    return (
        <div className="w-full rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("correction.title")}</p>

            <ul className="mt-3 flex flex-col gap-3">
                {corrections.map((correction, index) => (
                    <li key={index} className="rounded-lg bg-black/20 p-3">
                        <p className="text-sm leading-[1.6] text-red-300 line-through decoration-red-400/50">
                            {correction.fragment}
                        </p>
                        <p className="mt-1 text-xs text-emerald-300/80">{correction.rule}</p>

                        {correction.examples.length > 0 && (
                            <div className="mt-2 border-t border-white/5 pt-2">
                                <p className={EYEBROW}>{t("correction.examples")}</p>
                                <ul className="mt-1.5 flex flex-col gap-1">
                                    {correction.examples.map((example, exampleIndex) => (
                                        <li
                                            key={exampleIndex}
                                            className="text-xs leading-[1.6] text-[#f0f0f5]/70"
                                        >
                                            {example}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
