// src/components/landing/pricing/data.ts
// ARCHITECT: единый источник данных для тарифов.
// ARCHITECT: вынос текстов и функций позволяет легко редактировать контент без правки компонентов.

export type BillingPeriod = "month" | "year";

export interface PricingPlan {
    readonly id: "free" | "pro";
    readonly name: string;
    readonly description: string;
    readonly monthlyPrice: number;
    readonly yearlyPrice: number;
    readonly cta: string;
    readonly ctaSecondary?: string;
    readonly features: readonly Feature[];
    readonly highlighted: boolean;
}

export interface Feature {
    readonly text: string;
    readonly included: boolean;
    readonly limit?: string;
}

export const PRICING_PLANS: readonly PricingPlan[] = [
    {
        id: "free",
        name: "Blobus Free",
        description: "Идеально для знакомства с платформой и регулярной практики",
        monthlyPrice: 0,
        yearlyPrice: 0,
        cta: "Начать бесплатно",
        ctaSecondary: "7 дней Pro в подарок",
        highlighted: false,
        features: [
            { text: "1 урок в день (до 10 минут)", included: true },
            { text: "Все 4 режима обучения", included: true },
            { text: "Персонализация под цели", included: true },
            { text: "Память диалогов", included: true },
            { text: "Базовый голос ИИ (браузерный)", included: true },
            { text: "Безлимит уроков", included: false },
            { text: "Премиум-голос ИИ", included: false },
            { text: "Приоритетная скорость", included: false },
        ],
    },
    {
        id: "pro",
        name: "Blobus Pro",
        description: "Для тех, кто хочет учиться без ограничений и быстрее достигать целей",
        monthlyPrice: 3,
        yearlyPrice: 29,
        cta: "Попробовать 7 дней бесплатно",
        ctaSecondary: "Без привязки карты",
        highlighted: true,
        features: [
            { text: "Безлимит уроков", included: true },
            { text: "Все 4 режима обучения", included: true },
            { text: "Персонализация под цели", included: true },
            { text: "Память диалогов", included: true },
            { text: "Премиум-голос ИИ", included: true },
            { text: "Приоритетная скорость", included: true },
            { text: "Расширенная аналитика", included: true },
            { text: "Приоритетная поддержка", included: true },
        ],
    },
] as const;