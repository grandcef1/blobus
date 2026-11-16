// ARCHITECT: ключи словаря для действий и статусов тарифа собраны отдельно от разметки: карточка
// тарифа читает их как данные, а словарь остаётся единственным источником текстов. Динамическая
// строка-ключ не проверяется типами, поэтому соответствие задано таблицами с литеральными ключами.

import type { PlanId, SubscriptionStatus } from "@/types/billing";

export type ActionId =
    | "upgrade"
    | "payNow"
    | "cancel"
    | "resume"
    | "downgrade"
    | "undoDowngrade"
    | "retry";

export type ActionKey = `actions.${ActionId}`;

export const ACTION_KEYS: Readonly<Record<ActionId, ActionKey>> = {
    upgrade: "actions.upgrade",
    payNow: "actions.payNow",
    cancel: "actions.cancel",
    resume: "actions.resume",
    downgrade: "actions.downgrade",
    undoDowngrade: "actions.undoDowngrade",
    retry: "actions.retry",
};

export const PLAN_NAME_KEYS: Readonly<Record<PlanId, "plans.free.name" | "plans.pro.name">> = {
    free: "plans.free.name",
    pro: "plans.pro.name",
};

export type PeriodKey = "current.trialEndsOn" | "current.renewsOn" | "current.endsOn";

export const PERIOD_KEYS: Readonly<Record<Exclude<SubscriptionStatus, "free" | "past_due">, PeriodKey>> = {
    trialing: "current.trialEndsOn",
    active: "current.renewsOn",
    scheduled_cancel: "current.endsOn",
};
