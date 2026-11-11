// ARCHITECT: Подписка — текущий план выделен слоем (не белым),
// способы оплаты отдельным блоком, PDF-метка у иконок скачивания

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Download, CreditCard, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanId = "free" | "pro";
type BillingPeriod = "month" | "year";

interface PlanFeature {
    text: string;
    freeIncluded: boolean;
    proIncluded: boolean;
    freeLimit?: string;
}

interface PaymentHistory {
    id: string;
    date: string;
    amount: number;
    plan: string;
}

const FEATURES: readonly PlanFeature[] = [
    { text: "Уроки с ИИ-репетитором", freeIncluded: true, proIncluded: true, freeLimit: "1 в день" },
    { text: "Все режимы обучения", freeIncluded: true, proIncluded: true },
    { text: "Персонализация и память", freeIncluded: true, proIncluded: true },
    { text: "Премиум-голос ИИ", freeIncluded: false, proIncluded: true },
    { text: "Безлимит уроков", freeIncluded: false, proIncluded: true },
] as const;

const MOCK_PAYMENT_HISTORY: PaymentHistory[] = [
    { id: "pay_1", date: "2026-11-01", amount: 0, plan: "Free" },
    { id: "pay_2", date: "2026-10-01", amount: 0, plan: "Free" },
];

export function BillingPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");
    const currentPlan = "free" as PlanId;

    return (
        <div className="min-h-screen bg-black p-4 md:p-6">
            <div className="mx-auto max-w-3xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Подписка</h1>
                </motion.header>

                <div className="space-y-4">
                    <div className="flex justify-center">
                        <div className="inline-flex rounded-lg bg-[#141416] p-1">
                            <button
                                type="button"
                                onClick={() => setBillingPeriod("month")}
                                className={cn(
                                    "rounded-md px-4 py-1.5 text-sm transition-colors",
                                    billingPeriod === "month"
                                        ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                        : "text-[#f0f0f5]/50 hover:text-[#f0f0f5]/80"
                                )}
                            >
                                Ежемесячно
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingPeriod("year")}
                                className={cn(
                                    "rounded-md px-4 py-1.5 text-sm transition-colors",
                                    billingPeriod === "year"
                                        ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                        : "text-[#f0f0f5]/50 hover:text-[#f0f0f5]/80"
                                )}
                            >
                                Ежегодно
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <PlanCard
                            planId="free"
                            name="Blobus Free"
                            description="Для знакомства с платформой"
                            price={0}
                            period={billingPeriod}
                            isCurrent={currentPlan === "free"}
                            features={FEATURES}
                        />
                        <PlanCard
                            planId="pro"
                            name="Blobus Pro"
                            description="Безлимит уроков и премиум-голос"
                            price={billingPeriod === "month" ? 3 : 29}
                            period={billingPeriod}
                            isCurrent={currentPlan === "pro"}
                            features={FEATURES}
                        />
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-medium text-[#f0f0f5]/80">Способы оплаты</h2>
                                <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                    Карта нужна только для перехода на Pro
                                </p>
                            </div>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-lg bg-[#f0f0f5] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#f0f0f5]/90"
                            >
                                <Plus className="size-3.5" />
                                Добавить карту
                            </button>
                        </div>

                        <div className="flex items-center gap-4 rounded-xl bg-[#141416] p-4">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-[#1a1a1c]">
                                <CreditCard className="size-4 text-[#f0f0f5]/50" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-[#f0f0f5]/50">Нет сохранённых карт</p>
                                <p className="mt-0.5 text-xs text-[#f0f0f5]/30">
                                    Поддерживаются Visa, Mastercard, МИР
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-medium text-[#f0f0f5]/80">История платежей</h2>
                            <button className="text-xs text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70">
                                Все
                            </button>
                        </div>

                        <div className="space-y-2">
                            {MOCK_PAYMENT_HISTORY.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-[#f0f0f5]">
                                            Подписка {payment.plan}
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                            {new Date(payment.date).toLocaleDateString("ru", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold tabular-nums text-[#f0f0f5]">
                                            ${payment.amount}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Скачать счёт PDF"
                                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]/80"
                                        >
                                            <Download className="size-3.5" />
                                            PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PlanCardProps {
    planId: PlanId;
    name: string;
    description: string;
    price: number;
    period: BillingPeriod;
    isCurrent: boolean;
    features: readonly PlanFeature[];
}

function PlanCard({ planId, name, description, price, period, isCurrent, features }: PlanCardProps) {
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