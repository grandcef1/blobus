// src/components/landing/faq/data.ts
// ARCHITECT: вопросы и ответы живут в словаре landing, здесь — только состав списка и подписи авторов
// (имена не переводятся). Ключи выведены шаблонным типом, поэтому опечатка в имени вопроса — ошибка
// сборки, а не пустая карточка.

export type FaqItemId =
    | "different"
    | "modes"
    | "plans"
    | "cancel"
    | "languages"
    | "support"
    | "privacy";

export type FaqQuestionKey = `faq.items.${FaqItemId}.question`;
export type FaqShortKey = `faq.items.${FaqItemId}.short`;
export type FaqFullKey = `faq.items.${FaqItemId}.full`;

export interface FaqItem {
    readonly id: number;
    readonly userName: string;
    readonly questionKey: FaqQuestionKey;
    readonly shortKey: FaqShortKey;
    readonly fullKey: FaqFullKey;
    readonly featured?: boolean;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
    {
        id: 1,
        userName: "Blobus Team",
        questionKey: "faq.items.different.question",
        shortKey: "faq.items.different.short",
        fullKey: "faq.items.different.full",
        featured: true,
    },
    {
        id: 2,
        userName: "Maria",
        questionKey: "faq.items.modes.question",
        shortKey: "faq.items.modes.short",
        fullKey: "faq.items.modes.full",
    },
    {
        id: 3,
        userName: "John",
        questionKey: "faq.items.plans.question",
        shortKey: "faq.items.plans.short",
        fullKey: "faq.items.plans.full",
    },
    {
        id: 4,
        userName: "Sarah",
        questionKey: "faq.items.cancel.question",
        shortKey: "faq.items.cancel.short",
        fullKey: "faq.items.cancel.full",
    },
    {
        id: 5,
        userName: "David",
        questionKey: "faq.items.languages.question",
        shortKey: "faq.items.languages.short",
        fullKey: "faq.items.languages.full",
    },
    {
        id: 6,
        userName: "Emma",
        questionKey: "faq.items.support.question",
        shortKey: "faq.items.support.short",
        fullKey: "faq.items.support.full",
    },
    {
        id: 7,
        userName: "Alex",
        questionKey: "faq.items.privacy.question",
        shortKey: "faq.items.privacy.short",
        fullKey: "faq.items.privacy.full",
    },
];
