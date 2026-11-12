// ARCHITECT: категории вопросов — вкладки, а не теги: активная всегда одна, поэтому ряд не читается
// как набор включённых фильтров. Панели с content нет, но семантика tablist сохранена, а стрелки
// Left/Right переключают вкладку — для клавиатуры это привычнее клика по чипу.
// ARCHITECT: полоса скроллится по горизонтали (thin-scroll) и не переносится: на 360px шесть
// вкладок в строку не встают, а перенос ломал бы линию подчёркивания активной.

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { HELP_FAQ_CATEGORY_LABELS, HELP_FAQ_CATEGORY_ORDER } from "@/types/support";
import type { HelpFaqCategory } from "@/types/support";
import { cn } from "@/lib/utils";

export type FaqCategoryValue = HelpFaqCategory | "all";

interface FaqCategoryFilterProps {
    value: FaqCategoryValue;
    onChange: (value: FaqCategoryValue) => void;
}

const TAB =
    "min-h-11 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function FaqCategoryFilter({ value, onChange }: FaqCategoryFilterProps) {
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const options: { id: FaqCategoryValue; label: string }[] = [
        { id: "all", label: "Все" },
        ...HELP_FAQ_CATEGORY_ORDER.map((id) => ({ id, label: HELP_FAQ_CATEGORY_LABELS[id] })),
    ];

    const activeIndex = options.findIndex((option) => option.id === value);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();

        const step = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (activeIndex + step + options.length) % options.length;

        onChange(options[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="Категории вопросов"
            onKeyDown={handleKeyDown}
            className="thin-scroll flex gap-1 overflow-x-auto border-b border-white/5"
        >
            {options.map((option, index) => {
                const isSelected = option.id === value;

                return (
                    <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        ref={(node) => {
                            tabRefs.current[index] = node;
                        }}
                        onClick={() => onChange(option.id)}
                        className={cn(
                            TAB,
                            isSelected
                                ? "border-[#f0f0f5] text-[#f0f0f5]"
                                : "border-transparent text-[#f0f0f5]/50 hover:text-[#f0f0f5]/80"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
