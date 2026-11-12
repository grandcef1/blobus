// ARCHITECT: Подписка — текущий план выделен слоем (не белым), способы оплаты отдельным блоком,
// PDF-метка у иконок скачивания.
// ARCHITECT: тарифы и история платежей приходят из api/billing, поэтому скелетон страницы — это
// настоящее ожидание загрузки, а не декорация. Период оплаты — состояние интерфейса и остаётся
// здесь; карточка тарифа вынесена отдельным компонентом.

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Plus } from "lucide-react";
import { fetchBillingSummary } from "@/api/billing";
import { useMockQuery } from "@/hooks/useMockQuery";
import { PaymentHistoryCard } from "@/components/dashboard/PaymentHistoryCard";
import { PlanCard } from "@/components/dashboard/PlanCard";
import { BillingSkeleton } from "@/components/dashboard/skeletons/BillingSkeleton";
import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/api/billing";

export function BillingPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");
    const { data, isLoading } = useMockQuery(fetchBillingSummary);

    if (isLoading || data === null) return <BillingSkeleton />;

    const { currentPlan, features, paymentHistory } = data;

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
                            features={features}
                        />
                        <PlanCard
                            planId="pro"
                            name="Blobus Pro"
                            description="Безлимит уроков и премиум-голос"
                            price={billingPeriod === "month" ? 3 : 29}
                            period={billingPeriod}
                            isCurrent={currentPlan === "pro"}
                            features={features}
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

                    <PaymentHistoryCard payments={paymentHistory} />
                </div>
            </div>
        </div>
    );
}
