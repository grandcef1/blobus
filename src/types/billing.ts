// ARCHITECT: типы подписки вынесены из api/billing: их читает и mock-машина состояний, и разметка,
// а модуль api подключает их обратно реэкспортом — так у контракта нет циклических импортов.

import type { PlanId } from "@/lib/plans";

export type { PlanId };

/** free — тарифа нет, trialing — пробный период Pro, scheduled_cancel — доступ до конца периода. */
export type SubscriptionStatus = "free" | "trialing" | "active" | "past_due" | "scheduled_cancel";

export interface SubscriptionUsage {
    /** Счётчики за день, сбрасываются по UTC-дате. lessonsLimit и messagesLimit всегда числа,
     * безлимитных тарифов нет. */
    messagesUsed: number;
    messagesLimit: number;
    lessonsUsed: number;
    lessonsLimit: number;
    period: "day";
}

export interface Subscription {
    plan: PlanId;
    status: SubscriptionStatus;
    /** Конец оплаченного периода; null до первой оплаты. */
    periodEndsAt: string | null;
    trialEndsAt: string | null;
    /** Тариф, на который подписка переключится в конце периода. */
    pendingPlan: PlanId | null;
    usage: SubscriptionUsage;
}

export interface Invoice {
    id: string;
    date: string;
    amountUsd: number;
    status: "paid" | "failed" | "refunded";
}
