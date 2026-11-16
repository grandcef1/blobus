// ARCHITECT: цепочка подписки — это деньги и доступ: ошибка в переходах статусов отнимает доступ у
// заплатившего или оставляет триал бесконечным. Тест проходит ту же мок-машину состояний, что видит
// разработчик в браузере, поэтому проверяет и её переходы, и контракт api/billing.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    cancelSubscription,
    convertTrial,
    getInvoices,
    getSubscription,
    resumeSubscription,
    retryPayment,
    scheduleDowngrade,
    startCheckout,
    undoDowngrade,
} from "@/api/billing";
import { ApiError } from "@/api/client";
import { resetMockBilling, setMockNextPaymentFails, setMockStatus } from "@/api/mocks/billing";
import { PLANS } from "@/lib/plans";
import { resetStores } from "@/test/utils";

// ARCHITECT: проверяется мок-машина состояний: реальный режим ходил бы на ещё не существующий бэкенд.
vi.mock("@/lib/env", () => ({ USE_MOCKS: true }));

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;
// ARCHITECT: задержка мок-API — 400–900 мс; прокручиваем таймеры с запасом.
const MOCK_DELAY_MS = 1000;

/** Запускает действие и прокручивает его задержку: без этого промис никогда не разрешится. */
async function runAction<T>(action: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(MOCK_DELAY_MS);
    return action;
}

beforeEach(() => {
    vi.useFakeTimers();
    resetStores();
    // ARCHITECT: мок-машина хранит подписку в localStorage: без сброса тест унаследовал бы состояние
    // предыдущего.
    resetMockBilling();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("машина состояний подписки", () => {
    it("checkout переводит бесплатный тариф в пробный период Pro", async () => {
        await runAction(startCheckout());

        const subscription = await runAction(getSubscription());
        expect(subscription).toMatchObject({ plan: "pro", status: "trialing", periodEndsAt: null });
        expect(subscription.trialEndsAt).not.toBeNull();
    });

    it("оплата после триала даёт активную подписку и оплаченный счёт", async () => {
        await runAction(startCheckout());
        await runAction(convertTrial());

        const subscription = await runAction(getSubscription());
        expect(subscription).toMatchObject({
            plan: "pro",
            status: "active",
            pendingPlan: null,
            trialEndsAt: null,
        });
        expect(subscription.periodEndsAt).not.toBeNull();

        const invoices = await runAction(getInvoices());
        expect(invoices).toHaveLength(1);
        expect(invoices[0]).toMatchObject({ status: "paid", amountUsd: PLANS.pro.priceUsd });
    });

    it("провал оплаты даёт past_due, счёт failed и ошибку 402", async () => {
        setMockNextPaymentFails(true);
        await runAction(startCheckout());

        // ARCHITECT: catch навешивается до прокрутки таймеров: иначе отклонённый промис успел бы
        // выглядеть необработанным.
        const failure = await runAction(convertTrial().catch((error: unknown) => error));
        expect(failure).toBeInstanceOf(ApiError);
        expect(failure).toMatchObject({ statusCode: 402 });

        expect(await runAction(getSubscription())).toMatchObject({ status: "past_due" });
        expect((await runAction(getInvoices()))[0]).toMatchObject({ status: "failed" });
    });

    it("повторная оплата без флага провала возвращает активную подписку", async () => {
        setMockStatus("past_due");
        setMockNextPaymentFails(false);

        await runAction(retryPayment());

        expect(await runAction(getSubscription())).toMatchObject({ status: "active" });
    });

    it("отмена оставляет доступ до конца периода, возврат отмены его снимает", async () => {
        setMockStatus("active");

        await runAction(cancelSubscription());
        expect(await runAction(getSubscription())).toMatchObject({ status: "scheduled_cancel" });

        await runAction(resumeSubscription());
        expect(await runAction(getSubscription())).toMatchObject({ status: "active" });
    });

    it("возврат отмены во время триала возвращает пробный период", async () => {
        setMockStatus("trialing");

        await runAction(cancelSubscription());
        await runAction(resumeSubscription());

        expect(await runAction(getSubscription())).toMatchObject({ status: "trialing" });
    });

    it("запланированное понижение тарифа можно отменить", async () => {
        setMockStatus("active");

        await runAction(scheduleDowngrade());
        expect(await runAction(getSubscription())).toMatchObject({ pendingPlan: "free" });

        await runAction(undoDowngrade());
        expect(await runAction(getSubscription())).toMatchObject({ pendingPlan: null });
    });

    it("просроченный триал становится оплаченным периодом при чтении", async () => {
        setMockStatus("trialing");

        await vi.advanceTimersByTimeAsync((TRIAL_DAYS + 1) * DAY_MS);

        const subscription = await runAction(getSubscription());
        expect(subscription).toMatchObject({ status: "active", trialEndsAt: null });
        expect(subscription.periodEndsAt).not.toBeNull();
    });
});
