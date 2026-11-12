// ARCHITECT: список обращений. Строка — кнопка, а не div: переход в тред обязан работать с
// клавиатуры. Тема усечена, время относительное — абсолютная дата в списке читается хуже.

import { formatRelativeTime } from "@/lib/relativeTime";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import type { SupportTicket } from "@/types/support";

interface TicketListProps {
    tickets: SupportTicket[];
    onSelect: (ticketId: string) => void;
}

export function TicketList({ tickets, onSelect }: TicketListProps) {
    return (
        <section
            aria-labelledby="help-tickets-title"
            className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5"
        >
            <h2 id="help-tickets-title" className="text-base font-medium text-[#f0f0f5]">
                Мои обращения
            </h2>

            {tickets.length === 0 ? (
                <p className="mt-4 text-sm text-[#f0f0f5]/40">Обращений пока нет</p>
            ) : (
                <ul className="mt-3 flex flex-col gap-1">
                    {tickets.map((ticket) => (
                        <li key={ticket.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(ticket.id)}
                                className={cn(
                                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-white/[0.04]",
                                    FOCUS_RING
                                )}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-[#f0f0f5]/80">
                                        {ticket.subject}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[#f0f0f5]/40">
                                        {formatRelativeTime(ticket.updatedAt)}
                                    </span>
                                </span>
                                <TicketStatusBadge status={ticket.status} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
