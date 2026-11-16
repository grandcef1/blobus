// ARCHITECT: типы центра помощи. Статус обращения — три состояния вместо свободного текста:
// список, бейдж и фильтры читают одно и то же поле, а не сравнивают строки вручную.
// ARCHITECT: категории вопросов FAQ отдельны от категорий обращений: у вопросов своя ось
// («начало работы», «уроки»), у обращений — своя (что именно сломалось).

export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export const TICKET_STATUS_KEYS = {
    open: "help.ticketStatus.open",
    in_progress: "help.ticketStatus.in_progress",
    resolved: "help.ticketStatus.resolved",
} as const satisfies Record<SupportTicketStatus, string>;

export type TicketCategory = "billing" | "technical" | "lessons" | "account" | "other";

// ARCHITECT: категории хранят ключи словаря, а не текст — иначе в английском интерфейсе остались бы
// русские пункты. Тип значения — литерал, поэтому t() проверяет ключ при сборке.
export const TICKET_CATEGORY_KEYS = {
    billing: "help.ticketCategories.billing",
    technical: "help.ticketCategories.technical",
    lessons: "help.ticketCategories.lessons",
    account: "help.ticketCategories.account",
    other: "help.ticketCategories.other",
} as const satisfies Record<TicketCategory, string>;

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

export const HELP_FAQ_CATEGORY_KEYS = {
    start: "help.faqCategories.start",
    learning: "help.faqCategories.learning",
    billing: "help.faqCategories.billing",
    account: "help.faqCategories.account",
    tech: "help.faqCategories.tech",
} as const satisfies Record<HelpFaqCategory, string>;

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
