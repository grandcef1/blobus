// ARCHITECT: панель разработки подписки: статусы и провал оплаты иначе не проверить — реальный
// период длится месяц. Модуль импортируется динамически из BillingPage, и это единственное место,
// которое работает с мок-состоянием напрямую: прод в него не попадает, потому что ветка
// import.meta.env.DEV в сборке статически ложна.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    billingMock,
    resetMockBilling,
    setMockNextPaymentFails,
    setMockStatus,
} from "@/api/mocks/billing";
import { billingKeys } from "@/api/query-keys";
import { STATUS_KEYS, STATUS_ORDER } from "./status";
import { toast } from "@/store/toast";
import type { SubscriptionStatus } from "@/types/billing";

export function DevBillingPanel() {
    const { t } = useTranslation("billing");
    const queryClient = useQueryClient();
    const [fails, setFails] = useState(() => billingMock.nextPaymentFails());

    // ARCHITECT: после правки мок-состояния кэш сбрасывается: страница должна показать состояние,
    // которое панель только что выставила, без перезагрузки.
    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: billingKeys.all });
    };

    const applyStatus = (status: SubscriptionStatus) => {
        setMockStatus(status);
        invalidate();
    };

    const toggleFails = () => {
        const next = !fails;
        setFails(next);
        setMockNextPaymentFails(next);
        toast.info(t(next ? "dev.failPaymentOn" : "dev.failPaymentOff"));
    };

    const reset = () => {
        resetMockBilling();
        setFails(false);
        invalidate();
        toast.success(t("dev.resetDone"));
    };

    return (
        <aside className="rounded-2xl border border-dashed border-white/10 p-5">
            <h2 className="text-xs uppercase tracking-wider text-[#f0f0f5]/40">{t("dev.title")}</h2>

            <p className="mt-3 text-xs text-[#f0f0f5]/50">{t("dev.status")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {STATUS_ORDER.map((status) => (
                    <button
                        key={status}
                        type="button"
                        onClick={() => applyStatus(status)}
                        className="min-h-11 rounded-lg border border-white/15 px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                    >
                        {t(STATUS_KEYS[status])}
                    </button>
                ))}
            </div>

            <label className="mt-4 flex min-h-11 items-center gap-2 text-xs text-[#f0f0f5]/70">
                <input
                    type="checkbox"
                    checked={fails}
                    onChange={toggleFails}
                    className="size-4 accent-[#f0f0f5]"
                />
                {t("dev.failPayment")}
            </label>

            <button
                type="button"
                onClick={reset}
                className="mt-4 min-h-11 rounded-lg border border-white/15 px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
            >
                {t("dev.reset")}
            </button>
        </aside>
    );
}
