// ARCHITECT: mock-машина состояний подписки. Она детерминирована: одна и та же последовательность
// действий даёт один и тот же результат, поэтому цепочку подписки можно пройти руками и показать на
// ревью. Значения лежат в mock-db и переживают перезагрузку страницы.
// ARCHITECT: счёт создаётся только оплатой — успешной или провалившейся. Пробный период бесплатный,
// отдельного счёта на ноль не существует.

import { ApiError } from "@/api/client";
import { mockDb } from "@/api/mocks/mockDb";
import { PLANS } from "@/lib/plans";
import type { Invoice, PlanId, Subscription, SubscriptionStatus } from "@/types/billing";

const SUBSCRIPTION_KEY = "billing-subscription";
const INVOICES_KEY = "billing-invoices";
const FLAGS_KEY = "billing-flags";

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
const PERIOD_DAYS = 30;
const MOCK_MIN_DELAY_MS = 400;
const MOCK_MAX_DELAY_MS = 900;

// ARCHITECT: сид дневных счётчиков: 12 из 20 сообщений, 0 из 1 урока. Для теста плашки исчерпания в Ф3.4.
const SEED_SUBSCRIPTION: Subscription = {
    plan: "free",
    status: "free",
    periodEndsAt: null,
    trialEndsAt: null,
    pendingPlan: null,
    usage: {
        messagesUsed: 12,
        messagesLimit: PLANS.free.messagesLimit,
        lessonsUsed: 0,
        lessonsLimit: PLANS.free.lessonsLimit,
        period: "day",
    },
};

interface BillingFlags {
    nextPaymentFails: boolean;
}

const SEED_FLAGS: BillingFlags = { nextPaymentFails: false };

// ARCHITECT: оплата — «долгая» операция: разброс задержки показывает, что кнопки действительно
// заблокированы на время запроса, и интерфейс не выглядит подозрительно ровным.
export function delayBillingMock(): Promise<void> {
    const ms = MOCK_MIN_DELAY_MS + Math.random() * (MOCK_MAX_DELAY_MS - MOCK_MIN_DELAY_MS);
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function inDays(days: number): string {
    return new Date(Date.now() + days * DAY_MS).toISOString();
}

function isFuture(iso: string | null): boolean {
    return iso !== null && new Date(iso).getTime() > Date.now();
}

function readSubscription(): Subscription {
    return mockDb.get(SUBSCRIPTION_KEY, SEED_SUBSCRIPTION);
}

function saveSubscription(subscription: Subscription): Subscription {
    mockDb.set(SUBSCRIPTION_KEY, subscription);
    return subscription;
}

function readFlags(): BillingFlags {
    return mockDb.get(FLAGS_KEY, SEED_FLAGS);
}

function addInvoice(status: Invoice["status"], amountUsd: number): void {
    const invoice: Invoice = {
        id: `inv_${crypto.randomUUID().slice(0, 8)}`,
        date: new Date().toISOString(),
        amountUsd,
        status,
    };
    mockDb.set(INVOICES_KEY, [invoice, ...mockDb.get<Invoice[]>(INVOICES_KEY, [])]);
}

// ARCHITECT: пробный период кончается сам: при чтении подписки просроченный триал превращается в
// оплаченный период. Так же поступит бэкенд, поэтому клиент не считает дни самостоятельно.
function withTrialEnded(): Subscription {
    const subscription = readSubscription();
    if (subscription.status !== "trialing" || isFuture(subscription.trialEndsAt)) return subscription;
    return saveSubscription({
        ...subscription,
        status: "active",
        trialEndsAt: null,
        periodEndsAt: inDays(PERIOD_DAYS),
    });
}

function requireStatus(...allowed: readonly SubscriptionStatus[]): Subscription {
    const subscription = readSubscription();
    if (!allowed.includes(subscription.status)) {
        throw new ApiError(409, "Действие недоступно для текущего статуса подписки");
    }
    return subscription;
}

// ARCHITECT: «Оплатить сейчас» и «Повторить оплату» — одна операция: различается только статус, из
// которого её вызвали, а результат одинаков — активная подписка и счёт.
function startPaidPeriod(): void {
    if (readFlags().nextPaymentFails) {
        saveSubscription({ ...readSubscription(), status: "past_due" });
        addInvoice("failed", PLANS.pro.priceUsd);
        throw new ApiError(402, "Платёж не прошёл");
    }
    saveSubscription({
        ...readSubscription(),
        plan: "pro",
        status: "active",
        trialEndsAt: null,
        periodEndsAt: inDays(PERIOD_DAYS),
        pendingPlan: null,
    });
    addInvoice("paid", PLANS.pro.priceUsd);
}

export const billingMock = {
    subscription: (): Subscription => withTrialEnded(),
    invoices: (): Invoice[] => mockDb.get<Invoice[]>(INVOICES_KEY, []),
    startCheckout: (): void => {
        saveSubscription({
            ...requireStatus("free"),
            plan: "pro",
            status: "trialing",
            trialEndsAt: inDays(TRIAL_DAYS),
        });
    },
    pay: (): void => {
        requireStatus("trialing", "past_due");
        startPaidPeriod();
    },
    // ARCHITECT: отмена не обрывает доступ: меняется статус, дата конца периода сохраняется.
    cancel: (): void => {
        saveSubscription({
            ...requireStatus("trialing", "active", "past_due"),
            status: "scheduled_cancel",
        });
    },
    resume: (): void => {
        const subscription = requireStatus("scheduled_cancel");
        saveSubscription({
            ...subscription,
            status: isFuture(subscription.trialEndsAt) ? "trialing" : "active",
        });
    },
    scheduleDowngrade: (): void => {
        saveSubscription({ ...readSubscription(), pendingPlan: "free" });
    },
    undoDowngrade: (): void => {
        saveSubscription({ ...readSubscription(), pendingPlan: null });
    },
    nextPaymentFails: (): boolean => readFlags().nextPaymentFails,
};

// ARCHITECT: точки ниже вызывает только DEV-панель: они ломают состояние намеренно, чтобы статусы и
// провал оплаты проверялись без ожидания реального периода.
export function setMockStatus(status: SubscriptionStatus): void {
    const plan: PlanId = status === "free" ? "free" : "pro";
    const hasPeriod = status === "active" || status === "past_due" || status === "scheduled_cancel";
    saveSubscription({
        ...readSubscription(),
        plan,
        status,
        trialEndsAt: status === "trialing" ? inDays(TRIAL_DAYS) : null,
        periodEndsAt: hasPeriod ? inDays(PERIOD_DAYS) : null,
        pendingPlan: null,
    });
}

export function setMockNextPaymentFails(fails: boolean): void {
    mockDb.set(FLAGS_KEY, { nextPaymentFails: fails });
}

export function resetMockBilling(): void {
    mockDb.reset(SUBSCRIPTION_KEY);
    mockDb.reset(INVOICES_KEY);
    mockDb.reset(FLAGS_KEY);
}
