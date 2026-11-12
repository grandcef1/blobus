// ARCHITECT: поиск и категории по FAQ. Фильтр смотрит и вопрос, и ответ: люди часто помнят
// формулировку из ответа, а не из заголовка. Категория и поиск применяются одновременно.
// ARCHITECT: секция плоская, без внешней карточки: страница центра помощи уже держит ритм
// блоками, и ещё одна коробка вокруг списка давала вторую рамку в одном экране.
// ARCHITECT: аккордеон один на весь список (single-open) и без подписей групп: активная вкладка
// сама называет категорию, поэтому eyebrow-метки были дублированием.

import { useState } from "react";
import { Search } from "lucide-react";
import { HELP_FAQ } from "@/api/mocks/help";
import { HELP_FAQ_CATEGORY_ORDER } from "@/types/support";
import type { HelpFaqCategory, HelpFaqItem } from "@/types/support";
import { INPUT_SURFACE } from "@/lib/surfaces";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { FaqCategoryFilter } from "./FaqCategoryFilter";
import type { FaqCategoryValue } from "./FaqCategoryFilter";
import { cn } from "@/lib/utils";

export function HelpFaqList() {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<FaqCategoryValue>("all");

    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery = (item: HelpFaqItem): boolean =>
        !normalizedQuery ||
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery);

    // ARCHITECT: в режиме «Все» порядок задаёт HELP_FAQ_CATEGORY_ORDER, а не порядок моков:
    // список читается как оглавление и не меняется от правок в данных.
    const categoryOrder: HelpFaqCategory[] =
        category === "all" ? [...HELP_FAQ_CATEGORY_ORDER] : [category];

    const items = categoryOrder.flatMap((id) =>
        HELP_FAQ.filter((item) => item.category === id && matchesQuery(item))
    );

    return (
        <section aria-labelledby="help-faq-title" className="w-full">
            <h2 id="help-faq-title" className="text-base font-medium text-[#f0f0f5]">
                Частые вопросы
            </h2>

            <div className="relative mt-4">
                <Search
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/40"
                    aria-hidden="true"
                />
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск по вопросам"
                    aria-label="Поиск по вопросам"
                    className={cn(INPUT_SURFACE, "pl-10 focus:ring-[#f0f0f5]/20")}
                />
            </div>

            <div className="mt-3">
                <FaqCategoryFilter value={category} onChange={setCategory} />
            </div>

            {items.length === 0 ? (
                <p className="mt-4 text-sm text-[#f0f0f5]/40">Ничего не найдено</p>
            ) : (
                /* ARCHITECT: каждый вопрос — отдельный блок с собственными границами, а не строка
                   с hairline-разделителем: на длинных ответах список читается по частям. */
                <Accordion type="single" collapsible className="mt-3 flex flex-col gap-2">
                    {items.map((item) => (
                        <AccordionItem
                            key={item.id}
                            value={item.id}
                            className="rounded-xl border border-white/5 bg-white/[0.02] px-4"
                        >
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent className="pb-4 pr-4 text-sm leading-[1.6] text-[#f0f0f5]/70">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </section>
    );
}
