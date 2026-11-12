// ARCHITECT: обёртка Radix Accordion для списка частых вопросов. Триггер — сам вопрос, иконка
// поворачивается по состоянию, открытие и закрытие, ARIA и клавиатура — из Radix. Радиус и
// границы совпадают с карточками разделов, чтобы список не выглядел вставленным блоком.

import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Accordion(props: React.ComponentProps<typeof AccordionPrimitive.Root>) {
    return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn("border-b border-white/5 last:border-b-0", className)}
            {...props}
        />
    );
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
    return (
        <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    "group flex min-h-11 flex-1 items-center justify-between gap-4 py-3 text-left text-sm font-medium text-[#f0f0f5] transition-colors hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]",
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDown
                    className="size-4 shrink-0 text-[#f0f0f5]/40 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                />
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

function AccordionContent({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
    return (
        <AccordionPrimitive.Content
            data-slot="accordion-content"
            className={cn(
                "overflow-hidden pb-3 pr-8 text-sm leading-relaxed text-[#f0f0f5]/60",
                className
            )}
            {...props}
        />
    );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
