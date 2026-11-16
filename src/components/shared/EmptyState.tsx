// ARCHITECT: пустой список — это состояние данных, а не поломка: иконка, заголовок и объяснение
// показывают, что экран загрузился и записей просто нет. Объяснение обязательно отличается от
// заголовка: «список пуст» ничего не сообщает пользователю.
// ARCHITECT: тексты приходят пропами — общий компонент не знает домена и не диктует словарь
// вызывающему; смысл несут иконка и текст, цвет ничего не кодирует (монохром).

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    /** Основное действие пустого состояния: ссылка или кнопка. */
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <section className={cn("rounded-2xl bg-[#111113] p-5", className)}>
            <span className="flex size-10 items-center justify-center rounded-full border border-white/10">
                <Icon className="size-4 text-[#f0f0f5]/70" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-sm font-medium text-[#f0f0f5]">{title}</h2>
            {description !== undefined && (
                <p className="mt-1 text-xs leading-relaxed text-[#f0f0f5]/60">{description}</p>
            )}
            {action !== undefined && <div className="mt-4 flex flex-wrap items-center gap-3">{action}</div>}
        </section>
    );
}
