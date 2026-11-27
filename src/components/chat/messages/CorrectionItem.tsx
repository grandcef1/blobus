// ARCHITECT: одна правка карточки: разделы «как было / как верно / правило» стоят отдельными подложками светлее
// базовой поверхности, а между ними вертикальный отступ (§спец. 3). Файл отдельный: карточка-список остаётся
// короткой, а разметка одной правки живёт здесь (одна компонента на файл, §5.2).
// ARCHITECT: цвет значимого состояния продублирован начертанием: неверный фрагмент зачёркнут, верный — жирный:
// фон-маркер низкой альфы показывает место правки, не заливая строку, а без цвета карточка читается так же (§8.2).

import { useTranslation } from "react-i18next";
import type { ChatCorrection } from "@/api/chat";
import { highlightFragments } from "@/lib/highlightFragments";
import { emphasizeExample, highlightFixed, keyForm, splitExample } from "./correctionText";

interface CorrectionItemProps {
    readonly correction: ChatCorrection;
    /** Реплика ученика: из неё собирается пара «как было — как верно»; null — источника нет. */
    readonly source: string | null;
    /** Уровень A1-A2: под примерами показывается перевод. */
    readonly showTranslation: boolean;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-amber-300/70";
const SECTION = "flex flex-col gap-1.5 rounded-lg bg-[#1a1a1c] px-3 py-2.5";
const LABEL = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";
const WRONG_TEXT = "text-sm leading-[1.6] text-red-300";
const WRONG_MARK = "rounded bg-red-500/20 line-through decoration-red-400/50";
const RIGHT_TEXT = "text-sm leading-[1.6] text-[#f0f0f5]/90";
const RIGHT_MARK = "rounded bg-emerald-500/20 px-0.5 font-semibold text-emerald-300";
// ARCHITECT: правило стоит с слабой левой линией — оно опора карточки, а не ещё одна строка текста.
const RULE_TEXT = "border-l border-white/10 pl-3 text-xs leading-[1.6] text-[#f0f0f5]/60";

export function CorrectionItem({ correction, source, showTranslation }: CorrectionItemProps) {
    const { t } = useTranslation("common");
    // ARCHITECT: первый пример — исправленный вариант реплики ученика, остальные (до трёх) идут списком
    // примеров: так одна и та же строка не показывается дважды.
    const corrected = correction.examples[0] ?? null;
    const rest = correction.examples.slice(1, 4);
    const form = keyForm(source, corrected ?? correction.fragment);

    return (
        <li className="flex flex-col gap-2">
            {source !== null && (
                <section className={SECTION}>
                    <p className={LABEL}>{t("correction.original")}</p>
                    <p className={WRONG_TEXT}>
                        {highlightFragments(source, [correction.fragment]).map((segment, part) => (
                            <span key={part} className={segment.marked ? WRONG_MARK : undefined}>
                                {segment.text}
                            </span>
                        ))}
                    </p>
                </section>
            )}

            {corrected !== null && (
                <section className={SECTION}>
                    <p className={LABEL}>{t("correction.improved")}</p>
                    <p className={RIGHT_TEXT}>
                        {highlightFixed(source ?? correction.fragment, corrected).map(
                            (segment, part) => (
                                <span key={part} className={segment.fixed ? RIGHT_MARK : undefined}>
                                    {segment.text}
                                </span>
                            )
                        )}
                    </p>
                </section>
            )}

            <section className={SECTION}>
                <p className={LABEL}>{t("correction.rule")}</p>
                <p className={RULE_TEXT}>{correction.rule}</p>
            </section>

            {rest.length > 0 && (
                <div className="mt-1 border-t border-white/5 pt-3">
                    <p className={EYEBROW}>{t("correction.examples")}</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                        {rest.map((example, part) => {
                            const split = splitExample(example, showTranslation);

                            return (
                                <li
                                    key={part}
                                    className="text-xs leading-[1.6] text-[#f0f0f5]/70"
                                >
                                    {emphasizeExample(split.text, form).map((segment, at) => (
                                        <span
                                            key={at}
                                            className={
                                                segment.strong
                                                    ? "font-semibold text-[#f0f0f5]"
                                                    : undefined
                                            }
                                        >
                                            {segment.text}
                                        </span>
                                    ))}

                                    {split.translation !== null && (
                                        <span className="mt-0.5 block text-[#f0f0f5]/40">
                                            {split.translation}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </li>
    );
}
