// ARCHITECT: карточка текущего тарифа: статус показан текстом и тонким маркером, дата и цена — через
// Intl по языку интерфейса, строки дат в словаре не живут.
// ARCHITECT: набор кнопок зависит от статуса: пользователь видит только то действие, которое сейчас
// возможно, вместо отключённых кнопок «на будущее».

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { ACTION_KEYS, PERIOD_KEYS, PLAN_NAME_KEYS } from "./billing.keys";
import { STATUS_KEYS, STATUS_TONE } from "./status";
import { formatDate, formatUsd } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { ActionId } from "./billing.keys";
import type { Subscription } from "@/types/billing";

export interface CurrentPlanActions {
    upgrade: () => void;
    payNow: () => void;
    cancel: () => void;
    resume: () => void;
    downgrade: () => void;
    undoDowngrade: () => void;
    retry: () => void;
}

interface CurrentPlanCardProps {
    subscription: Subscription;
    actions: CurrentPlanActions;
    isPending: boolean;
}

// ARCHITECT: основные действия — светлая кнопка, второстепенные (отмена, смена тарифа) — контурная:
// на экране нет двух действий одинакового веса.
const PRIMARY_ACTIONS: readonly ActionId[] = ["upgrade", "payNow", "retry", "resume"];

function actionsFor(subscription: Subscription): readonly ActionId[] {
    switch (subscription.status) {
        case "free":
            return ["upgrade"];
        case "trialing":
            return ["payNow", "cancel"];
        case "past_due":
            return ["retry", "cancel"];
        case "scheduled_cancel":
            return ["resume"];
        case "active":
            return subscription.pendingPlan === null ? ["downgrade", "cancel"] : ["undoDowngrade"];
    }
}

export function CurrentPlanCard({ subscription, actions, isPending }: CurrentPlanCardProps) {
    const { t, i18n } = useTranslation("billing");
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const locale = i18n.language;
    const { status } = subscription;
    const endDate = subscription.periodEndsAt ?? subscription.trialEndsAt;
    const pendingPlan = subscription.pendingPlan;

    const periodLine =
        status === "free"
            ? null
            : status === "past_due"
              ? t("current.pastDuePayment")
              : endDate === null
                ? null
                : t(PERIOD_KEYS[status], { date: formatDate(endDate, locale) });

    const pendingLine =
        pendingPlan === null
            ? null
            : endDate === null
              ? t("current.pendingNoDate", { plan: t(PLAN_NAME_KEYS[pendingPlan]) })
              : t("current.pending", {
                    date: formatDate(endDate, locale),
                    plan: t(PLAN_NAME_KEYS[pendingPlan]),
                });

    const handlers: Readonly<Record<ActionId, () => void>> = {
        ...actions,
        cancel: () => setIsCancelOpen(true),
    };

    return (
        <section className="rounded-2xl bg-[#111113] p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-base font-medium text-[#f0f0f5]/80">{t("current.title")}</h2>
                    <p className="mt-1 text-xl font-semibold text-[#f0f0f5]">
                        {t(PLAN_NAME_KEYS[subscription.plan])}
                    </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f0f0f5]/10 px-3 py-1 text-xs text-[#f0f0f5]/70">
                    <span className={cn("size-1.5 rounded-full", STATUS_TONE[status])} aria-hidden="true" />
                    {t(STATUS_KEYS[status])}
                </span>
            </div>

            <p className="mt-3 text-sm tabular-nums text-[#f0f0f5]/60">
                {subscription.plan === "free"
                    ? t("current.free")
                    : t("current.price", { amount: formatUsd(PLANS.pro.priceUsd, locale) })}
            </p>
            {periodLine !== null && <p className="mt-1 text-xs text-[#f0f0f5]/40">{periodLine}</p>}
            {pendingLine !== null && <p className="mt-1 text-xs text-[#f0f0f5]/40">{pendingLine}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                {actionsFor(subscription).map((actionId) => (
                    <button
                        key={actionId}
                        type="button"
                        onClick={handlers[actionId]}
                        disabled={isPending}
                        aria-busy={isPending}
                        className={cn(
                            "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:cursor-not-allowed disabled:opacity-50 min-h-11",
                            PRIMARY_ACTIONS.includes(actionId)
                                ? "bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90"
                                : "border border-white/15 text-[#f0f0f5] hover:bg-white/5"
                        )}
                    >
                        {t(ACTION_KEYS[actionId])}
                    </button>
                ))}
            </div>

            <CancelSubscriptionDialog
                open={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                onConfirm={actions.cancel}
                isPending={isPending}
            />
        </section>
    );
}
