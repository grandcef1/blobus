// ARCHITECT: вид текстовых ссылок и вторичных кнопок в auth-экранах восстановления. Три страницы и
// две формы показывают один и тот же «Войти» / «Запросить новую ссылку»: разъехавшиеся ховеры
// читались бы как разные сайты.
// ARCHITECT: min-h-11 — планка касания 44px (rules 10): текстовая ссылка иначе остаётся высотой в
// одну строку текста.

import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/** Текстовая ссылка-действие: возврат ко входу, переход к повторной отправке. */
export const AUTH_TEXT_LINK = cn(
    "inline-flex min-h-11 items-center justify-center text-sm text-[#f0f0f5] underline underline-offset-4 transition-colors hover:no-underline",
    FOCUS_RING
);

/** Вторичная кнопка-CTA: «Запросить новую ссылку», «Войти» в статусных экранах. */
export const AUTH_SECONDARY_BUTTON = cn(
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#f0f0f5]/25 bg-transparent px-6 text-sm text-[#f0f0f5] shadow-none",
    "transition-colors hover:border-[#f0f0f5]/50 hover:bg-[#f0f0f5]/10",
    FOCUS_RING
);

/** Мета-строка под формой: «Вернуться ко входу» и прочие спокойные подписи. */
export const AUTH_META_LINE = "mt-4 text-center text-sm text-[#f0f0f5]/50";

/** Заголовок статусного блока внутри карточки (письмо отправлено, ссылка истекла). */
export const AUTH_STATUS_TITLE = "text-lg font-medium tracking-tight text-[#f0f0f5]";
