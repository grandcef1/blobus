// ARCHITECT: чипы-фильтры категорий. Один ряд с переносом вместо селекта: категорий пять, и
// выбор должен быть виден целиком, а не спрятан в выпадающий список.
// ARCHITECT: aria-pressed, а не role="tab": это переключатели фильтра, а не вкладки с панелями —
// вкладкам пришлось бы держать соответствие tab ↔ tabpanel, которого здесь нет.

import { HELP_FAQ_CATEGORY_LABELS, HELP_FAQ_CATEGORY_ORDER } from "@/types/support";
import type { HelpFaqCategory } from "@/types/support";
import { cn } from "@/lib/utils";

export type FaqCategoryValue = HelpFaqCategory | "all";

interface FaqCategoryFilterProps {
    value: FaqCategoryValue;
    onChange: (value: FaqCategoryValue) => void;
}

const CHIP =
    "flex min-h-11 items-center rounded-full border px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:min-h-9";

export function FaqCategoryFilter({ value, onChange }: FaqCategoryFilterProps) {
    const options: { id: FaqCategoryValue; label: string }[] = [
        { id: "all", label: "Все" },
        ...HELP_FAQ_CATEGORY_ORDER.map((id) => ({ id, label: HELP_FAQ_CATEGORY_LABELS[id] })),
    ];

    return (
        <div role="group" aria-label="Категории вопросов" className="flex flex-wrap gap-2">
            {options.map((option) => {
                const isSelected = option.id === value;

                return (
                    <button
                        key={option.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onChange(option.id)}
                        className={cn(
                            CHIP,
                            isSelected
                                ? "border-white/20 bg-white/10 text-[#f0f0f5]"
                                : "border-white/5 text-[#f0f0f5]/50 hover:border-white/15"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
