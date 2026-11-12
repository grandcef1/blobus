// ARCHITECT: поиск по FAQ и аккордеон. Фильтр смотрит и вопрос, и ответ: люди часто помнят
// формулировку из ответа, а не из заголовка. Пустой результат — одна строка без иллюстрации
// и кнопки: искать дальше здесь нечего, а кнопка в пустоте была бы шумом.

import { useState } from "react";
import { Search } from "lucide-react";
import { HELP_FAQ } from "@/api/mocks/help";
import { INPUT_SURFACE } from "@/lib/surfaces";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export function HelpFaqList() {
    const [query, setQuery] = useState("");

    const normalized = query.trim().toLowerCase();
    const items = normalized
        ? HELP_FAQ.filter(
              (item) =>
                  item.question.toLowerCase().includes(normalized) ||
                  item.answer.toLowerCase().includes(normalized)
          )
        : HELP_FAQ;

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

            {items.length === 0 ? (
                <p className="mt-4 text-sm text-[#f0f0f5]/40">Ничего не найдено</p>
            ) : (
                <Accordion type="single" collapsible className="mt-2">
                    {items.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger>{item.question}</AccordionTrigger>
                            <AccordionContent>{item.answer}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </section>
    );
}
