// ARCHITECT: модуль-хранилище обращений поверх моков, по образцу api/sessions: массив в памяти
// модуля и чистые функции доступа. Подтверждение от поддержки детерминированное — никаких
// таймеров и имитации «печатает»: состояние должно воспроизводиться один в один.

import { HELP_FAQ, MOCK_TICKETS } from "@/api/mocks/help";
import { delayMock } from "@/api/mockDelay";
import type { HelpFaqItem, SupportTicket, TicketCategory } from "@/types/support";

const ACK_DELAY_MS = 1000;
const ACK_TEXT = "Обращение зарегистрировано. Ответим в течение 24 часов в рабочие дни.";

const tickets: SupportTicket[] = [...MOCK_TICKETS];

export interface CreateTicketInput {
    subject: string;
    category: TicketCategory;
    message: string;
}

export function getTickets(): SupportTicket[] {
    return [...tickets].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getTicketById(ticketId: string): SupportTicket | undefined {
    return tickets.find((ticket) => ticket.id === ticketId);
}

export function createTicket(input: CreateTicketInput): SupportTicket {
    const now = Date.now();
    const ticket: SupportTicket = {
        id: crypto.randomUUID(),
        subject: input.subject.trim(),
        category: input.category,
        status: "open",
        createdAt: now,
        updatedAt: now + ACK_DELAY_MS,
        messages: [
            {
                id: crypto.randomUUID(),
                author: "user",
                content: input.message.trim(),
                timestamp: now,
            },
            {
                id: crypto.randomUUID(),
                author: "support",
                content: ACK_TEXT,
                timestamp: now + ACK_DELAY_MS,
            },
        ],
    };

    tickets.unshift(ticket);

    return ticket;
}

// ARCHITECT: сообщение в решённое обращение снова открывает его: у поддержки нет другого способа
// заметить продолжение разговора в закрытом треде.
export function sendTicketMessage(
    ticketId: string,
    content: string
): SupportTicket | undefined {
    const index = tickets.findIndex((ticket) => ticket.id === ticketId);
    if (index < 0) return undefined;

    const current = tickets[index];
    const now = Date.now();
    const updated: SupportTicket = {
        ...current,
        status: current.status === "resolved" ? "open" : current.status,
        updatedAt: now,
        messages: [
            ...current.messages,
            {
                id: crypto.randomUUID(),
                author: "user",
                content: content.trim(),
                timestamp: now,
            },
        ],
    };

    tickets[index] = updated;

    return updated;
}

// ARCHITECT: центр помощи грузится асинхронно: скелетон страницы — настоящее ожидание контента.
// Список FAQ читается здесь, а не моком напрямую: страницы передают его в HelpCenter.
export async function fetchFaqItems(): Promise<HelpFaqItem[]> {
    await delayMock();

    return HELP_FAQ;
}
