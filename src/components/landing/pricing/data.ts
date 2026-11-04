// src/components/landing/pricing/data.ts
// ARCHITECT: унифицированный список фич для обеих карточек.
// ARCHITECT: одинаковые пункты в Free и Pro, но с разными статусами included.
// ARCHITECT: сократили с 8 до 5 ключевых пунктов для снижения визуальной нагрузки.

export type BillingPeriod = "month" | "year";

export interface Feature {
    readonly text: string;
    readonly freeIncluded: boolean;
    readonly proIncluded: boolean;
    readonly freeLimit?: string;
}

export interface PricingPlan {
    readonly id: "free" | "pro";
    readonly name: string;
    readonly description: string;
    readonly monthlyPrice: number;
    readonly yearlyPrice: number;
    readonly cta: string;
    readonly ctaSecondary: string;
    readonly highlighted: boolean;
}

// ARCHITECT: единый список фич — порядок и формулировки идентичны для обеих карточек.
export const FEATURES: readonly Feature[] = [
    {
        text: "Уроки с ИИ-репетитором",
        freeIncluded: true,
        proIncluded: true,
        freeLimit: "1 в день",
    },
    {
        text: "Все режимы обучения",
        freeIncluded: true,
        proIncluded: true,
    },
    {
        text: "Персонализация и память",
        freeIncluded: true,
        proIncluded: true,
    },
    {
        text: "Премиум-голос ИИ",
        freeIncluded: false,
        proIncluded: true,
    },
    {
        text: "Безлимит уроков",
        freeIncluded: false,
        proIncluded: true,
    },
] as const;

export const PRICING_PLANS: readonly PricingPlan[] = [
    {
        id: "free",
        name: "Blobus Free",
        description: "Для знакомства с платформой и регулярной практики",
        monthlyPrice: 0,
        yearlyPrice: 0,
        cta: "Начать бесплатно",
        ctaSecondary: "7 дней Pro в подарок",
        highlighted: false,
    },
    {
        id: "pro",
        name: "Blobus Pro",
        description: "Для тех, кто хочет учиться без ограничений",
        monthlyPrice: 3,
        yearlyPrice: 29,
        cta: "Попробовать 7 дней",
        ctaSecondary: "Без привязки карты",
        highlighted: true,
    },
] as const;