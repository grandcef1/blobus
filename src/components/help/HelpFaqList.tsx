// ARCHITECT: поиск и категории по FAQ. Фильтр смотрит и вопрос, и ответ: люди часто помнят
// формулировку из ответа, а не из заголовка. Категория и поиск применяются одновременно.
// ARCHITECT: аккордеон один на весь список (single-open), а группы — подписи внутри него: так
// открытым остаётся ровно один вопрос, даже когда показаны все категории сразу.
// ARCHITECT: в режиме «Все» вопросы идут группами в порядке HELP_FAQ_CATEGORY_ORDER — список
// читается как оглавление, а не как случайная лента. Пустые группы не рисуются.

import { useState } from "react";
import { Search } from "lucide-react";
import { HELP_FAQ } from "@/api/mocks/help";
import { HELP_FAQ_CATEGORY_LABELS, HELP_FAQ_CATEGORY_ORDER } from "@/types/support";
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

const GROUP_LABEL = "mb-2 mt-4 text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";

export function HelpFaqList() {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState<FaqCategoryValue>("all");

    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery = (item: HelpFaqItem): boolean =>
        !normalizedQuery ||
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery);

    const categories: HelpFaqCategory[] =
        category === "all" ? [...HELP_FAQ_CATEGORY_ORDER] : [category];

    const groups = categories
        .map((id) => ({
            id,
            items: HELP_FAQ.filter((item) => item.category === id && matchesQuery(item)),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <section
            aria-labelledby="help-faq-title"
            className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5"
        >
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

            {groups.length === 0 ? (
                <p className="mt-4 text-sm text-[#f0f0f5]/40">Ничего не найдено</p>
            ) : (
                <Accordion type="single" collapsible className="mt-2">
                    {groups.map((group) => (
                        <div key={group.id}>
                            <h3 className={GROUP_LABEL}>{HELP_FAQ_CATEGORY_LABELS[group.id]}</h3>
                            {group.items.map((item) => (
                                <AccordionItem key={item.id} value={item.id}>
                                    <AccordionTrigger>{item.question}</AccordionTrigger>
                                    <AccordionContent>{item.answer}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </div>
                    ))}
                </Accordion>
            )}
        </section>
    );
}
