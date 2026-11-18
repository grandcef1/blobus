// src/components/landing/pricing/data.ts
// ARCHITECT: здесь остаётся структура тарифов (состав строк таблицы), а цены и набор возможностей
// приходят из lib/plans: прайс лендинга и страницы «Подписка» — одни и те же числа. Тексты — ключами
// словаря landing: строки живут в src/locales, поэтому смена языка не требует правок здесь.

import { PLANS, type PlanFeatureKey, type PlanId } from "@/lib/plans";

export type BillingPeriod = "month" | "year";

export type PricingFeatureKey =
    | "pricing.features.lessons"
    | "pricing.features.modes"
    | "pricing.features.memory"
    | "pricing.features.voice"
    | "pricing.features.lessonsMore";

export interface Feature {
    /** Ключ возможности в lib/plans: по нему таблица узнаёт, входит ли она в тариф. */
    readonly key: PlanFeatureKey;
    readonly textKey: PricingFeatureKey;
    readonly freeLimitKey?: "pricing.features.lessonsLimit";
}

export interface PricingPlan {
    readonly id: PlanId;
    readonly nameKey: "pricing.plans.free.name" | "pricing.plans.pro.name";
    readonly descriptionKey:
        | "pricing.plans.free.description"
        | "pricing.plans.pro.description";
    readonly monthlyPrice: number;
    readonly yearlyPrice: number;
    readonly ctaKey: "pricing.plans.free.cta" | "pricing.plans.pro.cta";
    readonly ctaSecondaryKey:
        | "pricing.plans.free.ctaSecondary"
        | "pricing.plans.pro.ctaSecondary";
    readonly highlighted: boolean;
}

// ARCHITECT: единый список возможностей — порядок строк задаёт лендинг, состав тарифа берётся из
// lib/plans, поэтому «входит ли в Pro» нигде не дублируется булевым полем.
export const FEATURES: readonly Feature[] = [
    { key: "lessons", textKey: "pricing.features.lessons", freeLimitKey: "pricing.features.lessonsLimit" },
    { key: "modes", textKey: "pricing.features.modes" },
    { key: "memory", textKey: "pricing.features.memory" },
    { key: "voice", textKey: "pricing.features.voice" },
    { key: "lessonsMore", textKey: "pricing.features.lessonsMore" },
];

// ARCHITECT: триал Pro — один раз на аккаунт. Защита от абуза (повторные регистрации) делается
// на бэкенде: флаг trial_used + верификация email. См. бэклог в конце ТЗ. Сейчас это только
// копирайт, логики нет.

export const PRICING_PLANS: readonly PricingPlan[] = [
    {
        id: "free",
        nameKey: "pricing.plans.free.name",
        descriptionKey: "pricing.plans.free.description",
        monthlyPrice: PLANS.free.priceUsd,
        yearlyPrice: PLANS.free.yearlyPriceUsd,
        ctaKey: "pricing.plans.free.cta",
        ctaSecondaryKey: "pricing.plans.free.ctaSecondary",
        highlighted: PLANS.free.highlighted,
    },
    {
        id: "pro",
        nameKey: "pricing.plans.pro.name",
        descriptionKey: "pricing.plans.pro.description",
        monthlyPrice: PLANS.pro.priceUsd,
        yearlyPrice: PLANS.pro.yearlyPriceUsd,
        ctaKey: "pricing.plans.pro.cta",
        ctaSecondaryKey: "pricing.plans.pro.ctaSecondary",
        highlighted: PLANS.pro.highlighted,
    },
];

