// ARCHITECT: карточка тарифа со списком возможностей: состояние «текущий план» показано слоем и
// подписью, а не цветом кнопки. Вынесена из страницы — та вышла за лимит строк, а карточка
// переиспользуется в двух тарифах одной разметкой.

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingPeriod, BillingPlanFeature, PlanId } from "@/api/billing";

interface PlanCardProps {
    planId: PlanId;
    name: string;
    description: string;
    price: number;
    period: BillingPeriod;
    isCurrent: boolean;
    features: readonly BillingPlanFeature[];
}

export function PlanCard({ planId, name, description, price, period, isCurrent, features }: PlanCardProps) {
    const periodLabel = period === "month" ? "/мес" : "/год";

    return (
        <div
            className={cn(
                "rounded-2xl p-5 transition-colors",
                isCurrent
                    ? "border border-[#f0f0f5]/25 bg-[#1a1a1c]"
                    : "bg-[#141416]"
            )}
        >
            <div className="mb-4 flex items-start justify-between">
                <div>
                    <h3 className="text-base font-semibold text-[#f0f0f5]">{name}</h3>
                    <p className="mt-0.5 text-xs text-[#f0f0f5]/40">{description}</p>
                </div>
                {isCurrent && (
                    <span className="rounded-full bg-[#f0f0f5]/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/70">
                        Активен
                    </span>
                )}
            </div>

            <div className="mb-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums text-[#f0f0f5]">${price}</span>
                <span className="text-sm text-[#f0f0f5]/50">{periodLabel}</span>
            </div>

            <ul className="mb-4 space-y-1.5">
                {features.map((feature) => {
                    const isIncluded = planId === "free" ? feature.freeIncluded : feature.proIncluded;
                    const limit = planId === "free" ? feature.freeLimit : undefined;

                    return (
                        <li key={feature.text} className="flex items-center gap-2">
                            {isIncluded ? (
                                <Check className="size-3.5 shrink-0 text-[#f0f0f5]" />
                            ) : (
                                <X className="size-3.5 shrink-0 text-[#f0f0f5]/20" />
                            )}
                            <span className={cn("text-xs", isIncluded ? "text-[#f0f0f5]/70" : "text-[#f0f0f5]/30")}>
                                {feature.text}
                                {limit && <span className="ml-1 text-[#f0f0f5]/40">· {limit}</span>}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                disabled={isCurrent}
                className={cn(
                    "w-full rounded-lg py-2.5 text-sm font-medium transition-colors",
                    isCurrent
                        ? "cursor-not-allowed bg-white/5 text-[#f0f0f5]/40"
                        : planId === "pro"
                            ? "bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90"
                            : "bg-white/10 text-[#f0f0f5] hover:bg-white/15"
                )}
            >
                {isCurrent ? "Текущий план" : "Перейти на Pro"}
            </button>
        </div>
    );
}