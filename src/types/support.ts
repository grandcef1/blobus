// ARCHITECT: типы центра помощи. Статус обращения — три состояния вместо свободного текста:
// список, бейдж и фильтры читают одно и то же поле, а не сравнивают строки вручную.

export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export type TicketCategory = "billing" | "technical" | "lessons" | "account" | "other";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
    billing: "Оплата и подписка",
    technical: "Техническая проблема",
    lessons: "Уроки и режимы",
    account: "Аккаунт",
    other: "Другое",
};

export interface SupportMessage {
    id: string;
    author: "user" | "support";
    content: string;
    timestamp: number;
}

export interface SupportTicket {
    id: string;
    subject: string;
    category: TicketCategory;
    status: SupportTicketStatus;
    createdAt: number;
    updatedAt: number;
    messages: SupportMessage[];
}

export interface HelpFaqItem {
    id: string;
    question: string;
    answer: string;
}
