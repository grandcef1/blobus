// ARCHITECT: точная подсветка правки: подчёркивается ровно тот участок реплики, который модель вернула в
// corrections.fragment, остальной текст остаётся обычным. Чистая функция без React: её проверяет юнит-тест,
// а разметку держит MessageBubble.

export interface HighlightSegment {
    readonly text: string;
    readonly marked: boolean;
}

interface Range {
    readonly from: number;
    readonly to: number;
}

// ARCHITECT: пустой фрагмент пропускается: indexOf("") вернул бы ноль, и подчёркивание легло бы на всю реплику.
function collectRanges(content: string, fragments: readonly string[]): Range[] {
    const ranges: Range[] = [];

    for (const fragment of fragments) {
        if (fragment === "") continue;

        let from = 0;

        for (;;) {
            const at = content.indexOf(fragment, from);

            if (at < 0) break;

            ranges.push({ from: at, to: at + fragment.length });
            from = at + fragment.length;
        }
    }

    return ranges.sort((left, right) => left.from - right.from || right.to - left.to);
}

/** Делит реплику на отрезки: marked — подчёркнутые фрагменты правок. */
export function highlightFragments(
    content: string,
    fragments: readonly string[]
): HighlightSegment[] {
    const merged: { from: number; to: number }[] = [];

    // ARCHITECT: пересекающиеся и вложенные диапазоны склеиваются: иначе вложенная правка дала бы наложение.
    for (const range of collectRanges(content, fragments)) {
        const last = merged[merged.length - 1];

        if (last !== undefined && range.from < last.to) {
            last.to = Math.max(last.to, range.to);
            continue;
        }

        merged.push({ from: range.from, to: range.to });
    }

    const segments: HighlightSegment[] = [];
    let cursor = 0;

    for (const range of merged) {
        if (range.from > cursor)
            segments.push({ text: content.slice(cursor, range.from), marked: false });

        segments.push({ text: content.slice(range.from, range.to), marked: true });
        cursor = range.to;
    }

    if (cursor < content.length) segments.push({ text: content.slice(cursor), marked: false });

    return segments;
}
