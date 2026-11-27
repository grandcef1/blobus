// ARCHITECT: текст карточки исправления собирается по данным модели: неверная строка — реплика ученика,
// верная — первый пример, а изменившийся фрагмент вычисляется сравнением. Модуль отдельный, потому что файл
// компонента не экспортирует ничего, кроме компонентов (react-refresh; рядом так же лежат quizCheck.ts).

import type { EnglishLevel } from "@/types/onboarding";

/** Уровни, на которых под примерами показывается перевод: выше B1 модель его не пишет. */
export const TRANSLATED_LEVELS: readonly EnglishLevel[] = ["A1", "A2"];

/** Разделитель «английский — перевод» внутри примера: тире в пробелах, а не дефис внутри слова. */
const TRANSLATION_SEPARATOR = / [-–—] /;

/** Отрезок исправленного предложения: fixed — ровно то, что изменилось. */
export interface CorrectedSegment {
    readonly text: string;
    readonly fixed: boolean;
}

function tokens(text: string): string[] {
    return text.split(/(\s+)/);
}

/**
 * Делит исправленное предложение на отрезки: совпадающие начало и конец остаются обычными, изменившаяся
 * середина помечается. Так исправление видно дословно, без выдуманной разметки.
 */
export function highlightFixed(wrong: string, right: string): readonly CorrectedSegment[] {
    const before = tokens(right);
    const source = tokens(wrong);
    let prefix = 0;

    while (prefix < source.length && prefix < before.length && source[prefix] === before[prefix])
        prefix += 1;

    let suffix = 0;

    while (
        suffix < source.length - prefix &&
        suffix < before.length - prefix &&
        source[source.length - 1 - suffix] === before[before.length - 1 - suffix]
    )
        suffix += 1;

    const head = before.slice(0, prefix).join("");
    const fixed = before.slice(prefix, before.length - suffix).join("");
    const tail = suffix === 0 ? "" : before.slice(before.length - suffix).join("");
    const segments: CorrectedSegment[] = [];

    if (head !== "") segments.push({ text: head, fixed: false });
    if (fixed !== "") segments.push({ text: fixed, fixed: true });
    if (tail !== "") segments.push({ text: tail, fixed: false });

    return segments;
}

/** Пример и его перевод: A1-A2 модель пишет перевод после тире, выше B1 он не показывается. */
export function splitExample(
    example: string,
    showTranslation: boolean
): { readonly text: string; readonly translation: string | null } {
    const at = showTranslation ? example.search(TRANSLATION_SEPARATOR) : -1;

    if (at < 0) return { text: example, translation: null };

    return {
        text: example.slice(0, at).trim(),
        translation: example.slice(at + 3).trim(),
    };
}

/** Отрезки примера с выделенной ключевой формой: ищется дословно, регистр не важен. */
export function emphasizeExample(
    example: string,
    form: string
): readonly { readonly text: string; readonly strong: boolean }[] {
    if (form === "") return [{ text: example, strong: false }];

    const at = example.toLowerCase().indexOf(form.toLowerCase());

    if (at < 0) return [{ text: example, strong: false }];

    return [
        { text: example.slice(0, at), strong: false },
        { text: example.slice(at, at + form.length), strong: true },
        { text: example.slice(at + form.length), strong: false },
    ].filter((segment) => segment.text !== "");
}

/** Ключевая форма правки: изменившаяся часть верного предложения — её же ищем в остальных примерах. */
export function keyForm(wrong: string | null, right: string): string {
    if (wrong === null) return "";

    return highlightFixed(wrong, right)
        .filter((segment) => segment.fixed)
        .map((segment) => segment.text.trim())
        .join(" ");
}
