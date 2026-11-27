// ARCHITECT: карточка исправления по спецификации: сверху «как было» (красным только неверный фрагмент), ниже
// «как верно» (зелёным только исправленный фрагмент), правило одной строкой с слабой левой линией, разделитель
// и примеры. Цвет продублирован начертанием — зачёркиванием у ошибки и жирным у верного варианта: без цвета
// карточка читается так же (§8.2, §12).
// ARCHITECT: текст карточки собирается из данных модели (fragment, examples): неверная строка — реплика
// ученика, верная — первый пример. Разбор строк живёт в correctionText.ts, поэтому файл экспортирует только
// компонент (react-refresh/only-export-components).

import { useTranslation } from "react-i18next";
import type { ChatCorrection } from "@/api/chat";
import { highlightFragments } from "@/lib/highlightFragments";
import type { EnglishLevel } from "@/types/onboarding";
import {
    TRANSLATED_LEVELS,
    emphasizeExample,
    highlightFixed,
    keyForm,
    splitExample,
} from "./correctionText";

interface CorrectionsRowProps {
    readonly corrections: readonly ChatCorrection[];
    /** Реплика ученика: из неё собирается пара «как было — как верно»; null — источника нет. */
    readonly source: string | null;
    /** Уровень ученика: на A1-A2 под примерами показывается перевод. */
    readonly level: EnglishLevel | null;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-amber-300/70";
// ARCHITECT: цвет значимого состояния продублирован начертанием: неверный фрагмент зачёркнут, верный — жирный.
// Красный и зелёный держат контраст выше AA на тёмной поверхности, а зачёркивание и жирность читаются без цвета.
const WRONG_TEXT = "text-sm leading-[1.6] text-red-300";
const WRONG_MARK = "line-through decoration-red-400/50";
const RIGHT_TEXT = "mt-1 text-sm leading-[1.6] text-[#f0f0f5]/90";
const RIGHT_MARK = "font-semibold text-emerald-300";
// ARCHITECT: правило стоит с слабой левой линией — оно опора карточки, а не ещё одна строка текста.
const RULE_TEXT = "mt-2 border-l border-white/10 pl-3 text-xs leading-[1.6] text-[#f0f0f5]/60";

export function CorrectionsRow({ corrections, source, level }: CorrectionsRowProps) {
    const { t } = useTranslation("common");

    if (corrections.length === 0) return null;

    const showTranslation = level !== null && TRANSLATED_LEVELS.includes(level);

    return (
        <div className="w-full rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("correction.title")}</p>

            <ul className="mt-3 flex flex-col gap-4">
                {corrections.map((correction, index) => {
                    // ARCHITECT: первый пример — исправленный вариант реплики ученика, остальные (до трёх) идут
                    // списком примеров: так одна и та же строка не показывается дважды.
                    const corrected = correction.examples[0] ?? null;
                    const rest = correction.examples.slice(1, 4);
                    const form = keyForm(source, corrected ?? correction.fragment);

                    return (
                        <li key={index} className="rounded-lg bg-black/20 p-3">
                            {source !== null && (
                                <p className={WRONG_TEXT}>
                                    <span className="sr-only">{t("correction.original")}: </span>
                                    {highlightFragments(source, [correction.fragment]).map(
                                        (segment, part) => (
                                            <span
                                                key={part}
                                                className={segment.marked ? WRONG_MARK : undefined}
                                            >
                                                {segment.text}
                                            </span>
                                        )
                                    )}
                                </p>
                            )}

                            {corrected !== null && (
                                <p className={RIGHT_TEXT}>
                                    <span className="sr-only">{t("correction.improved")}: </span>
                                    {highlightFixed(source ?? correction.fragment, corrected).map(
                                        (segment, part) => (
                                            <span
                                                key={part}
                                                className={segment.fixed ? RIGHT_MARK : undefined}
                                            >
                                                {segment.text}
                                            </span>
                                        )
                                    )}
                                </p>
                            )}

                            <p className={RULE_TEXT}>{correction.rule}</p>

                            {rest.length > 0 && (
                                <div className="mt-2 border-t border-white/5 pt-2">
                                    <p className={EYEBROW}>{t("correction.examples")}</p>
                                    <ul className="mt-1.5 flex flex-col gap-1.5">
                                        {rest.map((example, part) => {
                                            const split = splitExample(example, showTranslation);

                                            return (
                                                <li
                                                    key={part}
                                                    className="text-xs leading-[1.6] text-[#f0f0f5]/70"
                                                >
                                                    {emphasizeExample(split.text, form).map(
                                                        (segment, at) => (
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
                                                        )
                                                    )}

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
                })}
            </ul>
        </div>
    );
}
