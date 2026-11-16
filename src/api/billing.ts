// ARCHITECT: контракт подписки и двойная реализация. USE_MOCKS=true читает mock-машину состояний из
// api/mocks/billing, false — ходит в бэкенд через apiClient. Разметка не знает, откуда пришли
// данные: меняется только эта ветка, а типы и промисы у обеих реализаций одинаковые.
// ARCHITECT: эндпоинты реального режима: GET /billing/subscription, GET /billing/invoices,
// POST /billing/checkout|convert|retry|cancel|resume|downgrade|undo-downgrade. Провайдер оплаты
// выбирается позже (не Stripe): клиент отправляет намерение, ссылку на оплату отдаёт бэкенд.
// ARCHITECT: типы живут в types/billing и реэкспортируются здесь — потребители импортируют контракт
// из одного модуля, как AuthUser из api/auth.

import { apiClient } from "@/api/client";
import { billingMock, delayBillingMock } from "@/api/mocks/billing";
import { USE_MOCKS } from "@/lib/env";
import type { Invoice, Subscription } from "@/types/billing";

export type {
    Invoice,
    PlanId,
    Subscription,
    SubscriptionStatus,
    SubscriptionUsage,
} from "@/types/billing";

export async function getSubscription(): Promise<Subscription> {
    if (USE_MOCKS) {
        await delayBillingMock();
        return billingMock.subscription();
    }
    return apiClient.get<Subscription>("/billing/subscription");
}

// ARCHITECT: счета читаются отдельным запросом: ошибка в истории платежей не должна скрывать
// состояние подписки, а список нужен только нижней секции страницы.
export async function getInvoices(): Promise<Invoice[]> {
    if (USE_MOCKS) {
        await delayBillingMock();
        return billingMock.invoices();
    }
    return apiClient.get<Invoice[]>("/billing/invoices");
}

// ARCHITECT: действия возвращают void: свежее состояние приходит следующим чтением подписки, поэтому
// клиент не собирает его сам из ответа и не расходится с сервером.
export async function startCheckout(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.startCheckout();
        return;
    }
    await apiClient.post<void>("/billing/checkout");
}

export async function convertTrial(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.pay();
        return;
    }
    await apiClient.post<void>("/billing/convert");
}

export async function retryPayment(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.pay();
        return;
    }
    await apiClient.post<void>("/billing/retry");
}

export async function cancelSubscription(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.cancel();
        return;
    }
    await apiClient.post<void>("/billing/cancel");
}

export async function resumeSubscription(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.resume();
        return;
    }
    await apiClient.post<void>("/billing/resume");
}

export async function scheduleDowngrade(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.scheduleDowngrade();
        return;
    }
    await apiClient.post<void>("/billing/downgrade");
}

export async function undoDowngrade(): Promise<void> {
    if (USE_MOCKS) {
        await delayBillingMock();
        billingMock.undoDowngrade();
        return;
    }
    await apiClient.post<void>("/billing/undo-downgrade");
}
