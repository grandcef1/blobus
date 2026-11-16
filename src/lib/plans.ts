// ARCHITECT: единственный источник цен, лимитов и состава тарифов: лендинг и страница «Подписка»
// читают одни и те же числа, поэтому тарифы не расходятся. Тексты остаются в словарях — здесь только
// данные, и keys указывают, какие строки показывать.

export type PlanId = "free" | "pro";

export type PlanFeatureKey = "lessons" | "modes" | "memory" | "voice" | "unlimited";

export interface Plan {
    readonly id: PlanId;
    /** Цена за месяц в долларах; годовая — за предоплату года. */
    readonly priceUsd: number;
    readonly yearlyPriceUsd: number;
    /** Лимит сообщений в месяц; null — безлимит. */
    readonly messagesLimit: number | null;
    /** Возможности тарифа: порядок и состав для таблицы сравнения и карточки подписки. */
    readonly featureKeys: readonly PlanFeatureKey[];
    readonly highlighted: boolean;
}

export const PLANS: Readonly<Record<PlanId, Plan>> = {
    free: {
        id: "free",
        priceUsd: 0,
        yearlyPriceUsd: 0,
        messagesLimit: 50,
        featureKeys: ["lessons", "modes", "memory"],
        highlighted: false,
    },
    pro: {
        id: "pro",
        priceUsd: 3,
        yearlyPriceUsd: 29,
        messagesLimit: null,
        featureKeys: ["lessons", "modes", "memory", "voice", "unlimited"],
        highlighted: true,
    },
};

export const PLAN_ORDER: readonly PlanId[] = ["free", "pro"];
