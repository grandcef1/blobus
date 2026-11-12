// ARCHITECT: типы центра помощи. Статус обращения — три состояния вместо свободного текста:
// список, бейдж и фильтры читают одно и то же поле, а не сравнивают строки вручную.
// ARCHITECT: категории вопросов FAQ отдельны от категорий обращений: у вопросов своя ось
// («начало работы», «уроки»), у обращений — своя (что именно сломалось).

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

export type HelpFaqCategory = "start" | "learning" | "billing" | "account" | "tech";

export const HELP_FAQ_CATEGORY_LABELS: Record<HelpFaqCategory, string> = {
    start: "Начало работы",
    learning: "Уроки и режимы",
    billing: "Тарифы и оплата",
    account: "Аккаунт и данные",
    tech: "Технические вопросы",
};

// ARCHITECT: порядок категорий задаётся здесь, а не порядком ключей в объекте: именно он задаёт
// последовательность групп в списке вопросов, и его же читает фильтр.
export const HELP_FAQ_CATEGORY_ORDER: readonly HelpFaqCategory[] = [
    "start",
    "learning",
    "billing",
    "account",
    "tech",
];

export interface HelpFaqItem {
    id: string;
    category: HelpFaqCategory;
    question: string;
    answer: string;
}
