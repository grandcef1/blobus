// ARCHITECT: карточка разбора правки: исправленная фраза, правило и примеры. Текст правки подсвечен янтарным,
// как у карточки исправления в примерах-сессиях: это то же самое состояние, и вид у него один (§3.3).
// ARCHITECT: модель присылает исправленный вариант (не исходный), поэтому исходник здесь не выдумывается:
// подчёркивание относится к реплике ученика, а карточка объясняет правило.

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
                        <p className="text-sm leading-[1.6] text-[#f0f0f5]/90">
                            {correction.fragment}
                        </p>
                        <p className="mt-1 text-xs text-[#f0f0f5]/50">{correction.rule}</p>

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
