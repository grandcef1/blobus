// ARCHITECT: тарифы и история платежей читаются через модуль-хранилище: страница «Подписка»
// показывает скелетон, пока данные в пути. Значения — те же, что были в разметке, перенесены без
// изменений, поэтому вид страницы не поехал.

import { delayMock } from "@/api/mockDelay";

export type PlanId = "free" | "pro";

/** Период оплаты: переключатель на странице тарифов и в разделе «Подписка». */
export type BillingPeriod = "month" | "year";

export interface BillingPlanFeature {
    text: string;
    freeIncluded: boolean;
    proIncluded: boolean;
    freeLimit?: string;
}

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    plan: string;
}

export interface BillingSummary {
    currentPlan: PlanId;
    features: readonly BillingPlanFeature[];
    paymentHistory: PaymentRecord[];
}

const FEATURES: readonly BillingPlanFeature[] = [
    { text: "Уроки с ИИ-репетитором", freeIncluded: true, proIncluded: true, freeLimit: "1 в день" },
    { text: "Все режимы обучения", freeIncluded: true, proIncluded: true },
    { text: "Персонализация и память", freeIncluded: true, proIncluded: true },
    { text: "Премиум-голос ИИ", freeIncluded: false, proIncluded: true },
    { text: "Безлимит уроков", freeIncluded: false, proIncluded: true },
];

const PAYMENT_HISTORY: PaymentRecord[] = [
    { id: "pay_1", date: "2026-11-01", amount: 0, plan: "Free" },
    { id: "pay_2", date: "2026-10-01", amount: 0, plan: "Free" },
];

export async function fetchBillingSummary(): Promise<BillingSummary> {
    await delayMock();

    return { currentPlan: "free", features: FEATURES, paymentHistory: PAYMENT_HISTORY };
}