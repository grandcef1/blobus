// ARCHITECT: единый источник правды для поверхностей онбординга. Значения сняты
// с карточки welcome — она эталон и менять её вид нельзя. Замечание к ТЗ: в описании
// карточки welcome указаны backdrop-blur-xl и тень, но в коде стоит backdrop-blur-[5px]
// без тени; беру фактические значения, чтобы welcome остался идентичен базовому скриншоту.
// ARCHITECT: blur держим на 5px — форма и тонкая граница держат контур, сильный блюр
// размывает границу и спорит с линиями глобуса.

import { cn } from "@/lib/utils";

/** Стеклянная поверхность карточки welcome: фон, граница, блюр. */
export const GLASS_SURFACE = "border border-white/5 bg-black/20 backdrop-blur-[5px]";

/** Единый радиус карточек, плиток и инпутов остальных шагов. */
export const CARD_RADIUS = "rounded-3xl";

/** Форма «лист» — только у карточки welcome. */
export const LEAF_RADIUS = "rounded-[2.5rem_1rem_2.5rem_1rem]";

/** Фокус-кольцо, идентичное CTA welcome. */
export const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black";

/** Выбранная плитка: лёгкая заливка и усиленный бордер. */
const SELECTED_TILE = "border-white/20 bg-white/10";

/** Заливка выбранного состояния — для табов и селектов, где бордер уже задан. */
export const SELECTED_FILL = "bg-white/10";

/** Плитка в покое: та же стеклянная поверхность, бордер светлеет на ховере. */
const IDLE_TILE = "border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/[0.03]";

/** Primary-кнопка — белая пилюля как «Начать» на welcome. */
export const PRIMARY_BUTTON =
    "flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f0f0f5] px-6 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#f0f0f5]/30 disabled:hover:bg-white/10";

/** Secondary — стеклянный ghost. */
export const GHOST_BUTTON =
    "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]";

/** Eyebrow и мета-строка — как на welcome. */
export const EYEBROW = "text-xs text-[#f0f0f5]/50";
export const META_LINE = "text-xs text-[#f0f0f5]/50";

/** Шкала заголовка шага: тот же трекинг и вес, что у welcome, но ступенью ниже. */
export const STEP_TITLE = "text-3xl font-bold leading-tight tracking-tight text-[#f0f0f5] md:text-4xl";
export const STEP_SUBTITLE = "text-sm leading-relaxed text-[#f0f0f5]/60 md:text-base";

/** Инпут и селект: стеклянная поверхность вместо непрозрачного фона. */
export const INPUT_SURFACE =
    "w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-base text-[#f0f0f5] backdrop-blur-[5px] transition-colors placeholder:text-[#f0f0f5]/25 focus:outline-none focus:ring-2";

/** Классы опционной плитки — одна точка правды для всех шагов. */
export function tileClasses(selected: boolean, className?: string): string {
    return cn(
        "border transition-colors",
        GLASS_SURFACE,
        CARD_RADIUS,
        FOCUS_RING,
        selected ? SELECTED_TILE : IDLE_TILE,
        className
    );
}
