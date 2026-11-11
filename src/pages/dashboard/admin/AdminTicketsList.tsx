// ARCHITECT: тикеты. Строка на телефоне складывается в колонку: тема длиннее половины
// экрана, в одну строку она обрезалась бы до нечитаемого. Статус и приоритет — маркер и
// текст вместо цветных плашек, различие в насыщенности маркера.
// ARCHITECT: кнопка «Все» удалена: обработчика не было, а страницы со всеми тикетами нет.

import { MoreHorizontal } from "lucide-react";
import { StatusMarker } from "@/components/shared/StatusMarker";
import { ADMIN_TICKETS, PRIORITY_LABELS, TICKET_STATUS_LABELS, formatAdminDate } from "./adminData";
import type { AdminTicket } from "./adminData";

type Emphasis = "solid" | "muted" | "faint";

const TICKET_STATUS_EMPHASIS: Record<AdminTicket["status"], Emphasis> = {
    open: "solid",
    "in-progress": "muted",
    resolved: "faint",
};

const PRIORITY_EMPHASIS: Record<AdminTicket["priority"], Emphasis> = {
    high: "solid",
    medium: "muted",
    low: "faint",
};

export function AdminTicketsList() {
    return (
        <section aria-labelledby="admin-tickets-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <h2 id="admin-tickets-title" className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                Последние тикеты
            </h2>

            <div className="space-y-2">
                {ADMIN_TICKETS.map((ticket) => (
                    <article
                        key={ticket.id}
                        className="flex flex-col gap-2 rounded-xl bg-[#141416] px-4 py-3 transition-colors hover:bg-[#1a1a1c] sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="min-w-0 truncate text-sm font-medium text-[#f0f0f5]">
                                    {ticket.subject}
                                </p>
                                <StatusMarker
                                    label={PRIORITY_LABELS[ticket.priority]}
                                    emphasis={PRIORITY_EMPHASIS[ticket.priority]}
                                    className="shrink-0"
                                />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[#f0f0f5]/40">
                                {ticket.userName} · {formatAdminDate(ticket.createdAt)}
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            <StatusMarker
                                label={TICKET_STATUS_LABELS[ticket.status]}
                                emphasis={TICKET_STATUS_EMPHASIS[ticket.status]}
                            />
                            <button
                                type="button"
                                aria-label="Действия с тикетом"
                                className="flex size-11 items-center justify-center rounded-lg text-[#f0f0f5]/40 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                            >
                                <MoreHorizontal className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
