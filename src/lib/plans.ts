// ARCHITECT: единственный источник цен, лимитов и состава тарифов: лендинг и страница «Подписка»
// читают одни и те же числа, поэтому тарифы не расходятся. Тексты остаются в словарях — здесь только
// данные, и keys указывают, какие строки показывать.

export type PlanId = "free" | "pro";

export type PlanFeatureKey =
    "lessons" | "modes" | "memory" | "voice" | "lessonsBasic" | "lessonsMore";

export interface Plan {
    readonly id: PlanId;
    /** Цена за месяц в долларах; годовая — за предоплату года. */
    readonly priceUsd: number;
    readonly yearlyPriceUsd: number;
    // ARCHITECT: messagesLimit и lessonsLimit — числа; безлимитных тарифов нет, null больше не используется;
    // значения синхронизированы с public.entitlements в миграции quotas.sql (daily_lessons_limit=1/10,
    // daily_messages_limit=20/300).
    /** Лимит сообщений в день. */
    readonly messagesLimit: number;
    /** Лимит уроков в день. */
    readonly lessonsLimit: number;
    /** Возможности тарифа: порядок и состав для таблицы сравнения и карточки подписки. */
    readonly featureKeys: readonly PlanFeatureKey[];
    readonly highlighted: boolean;
}

export const PLANS: Readonly<Record<PlanId, Plan>> = {
    free: {
        id: "free",
        priceUsd: 0,
        yearlyPriceUsd: 0,
        messagesLimit: 20,
        lessonsLimit: 1,
        featureKeys: ["lessons", "modes", "memory", "lessonsBasic"],
        highlighted: false,
    },
    pro: {
        id: "pro",
        priceUsd: 3,
        yearlyPriceUsd: 29,
        messagesLimit: 300,
        lessonsLimit: 10,
        featureKeys: ["lessons", "modes", "memory", "voice", "lessonsMore"],
        highlighted: true,
    },
};

export const PLAN_ORDER: readonly PlanId[] = ["free", "pro"];
