// ARCHITECT: пара «ключ словаря + тон маркера» живёт рядом: статус подписывают карточка тарифа и
// DEV-панель, поэтому подписи не могут разойтись. Смысл статуса несёт текст, тон лишь подчёркивает
// его — состояние не передаётся одним цветом.

import type { SubscriptionStatus } from "@/types/billing";

export const STATUS_KEYS = {
    free: "status.free",
    trialing: "status.trialing",
    active: "status.active",
    past_due: "status.past_due",
    scheduled_cancel: "status.scheduled_cancel",
} as const;

export const STATUS_TONE: Readonly<Record<SubscriptionStatus, string>> = {
    free: "bg-[#f0f0f5]/30",
    trialing: "bg-green-400",
    active: "bg-green-400",
    past_due: "bg-amber-400",
    scheduled_cancel: "bg-[#f0f0f5]/30",
};

export const STATUS_ORDER: readonly SubscriptionStatus[] = [
    "free",
    "trialing",
    "active",
    "past_due",
    "scheduled_cancel",
];
