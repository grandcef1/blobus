// ARCHITECT: вид правовых страниц в одном месте: пилюля-ссылка и подчёркнутая ссылка встречаются на
// трёх документах, и разъехавшиеся ховеры читались бы как разные сайты.
// ARCHITECT: h-11 = планка касания 44px, как у кнопок лендинга.

import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/** Пилюля документа: возврат на главную, перекрёстная навигация, кнопка согласия. */
export const LEGAL_PILL = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[#f0f0f5]/20 px-5 text-sm text-[#f0f0f5]",
    "transition-colors hover:border-[#f0f0f5]/40 hover:bg-[#f0f0f5]/10",
    FOCUS_RING
);

/** Текущий документ в перекрёстной навигации: не цвет, а плотность заливки и границы. */
export const LEGAL_PILL_CURRENT = "border-[#f0f0f5]/60 bg-[#f0f0f5]/10";

/** Ссылка внутри текста: mailto и переходы между документами. */
export const LEGAL_INLINE_LINK = cn(
    "w-fit text-sm text-[#f0f0f5]/70 underline transition-colors hover:text-[#f0f0f5] hover:no-underline",
    FOCUS_RING
);
