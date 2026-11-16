// ARCHITECT: страница только собирает секции: данные приходят из query-хуков, действия — из мутаций,
// поэтому экран не знает ни об api-слое, ни о мок-режиме.
// ARCHITECT: загрузка показывается скелетоном раскладки, отказ загрузки — общим ErrorState с повтором:
// пустой экран при сбое читается как поломка приложения.

import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/shared/ErrorState";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { InvoicesList } from "@/components/billing/InvoicesList";
import { PastDueBanner } from "@/components/billing/PastDueBanner";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { BillingSkeleton } from "@/components/dashboard/skeletons/BillingSkeleton";
import { useBillingMutations } from "@/hooks/queries/billing/useBillingMutations";
import { useInvoices } from "@/hooks/queries/billing/useInvoices";
import { useSubscription } from "@/hooks/queries/billing/useSubscription";

// ARCHITECT: панель разработки подключается условно: в прод-сборке ветка import.meta.env.DEV
// статически ложна, поэтому и её чанк в бандл не попадает.
const DevBillingPanel = import.meta.env.DEV
    ? lazy(() =>
          import("@/components/billing/DevBillingPanel").then((module) => ({
              default: module.DevBillingPanel,
          }))
      )
    : null;

export function BillingPage() {
    const { t } = useTranslation("billing");
    const subscription = useSubscription();
    const invoices = useInvoices();
    const mutations = useBillingMutations();

    if (subscription.isError || invoices.isError) {
        return (
            <div className="min-h-screen bg-black p-4 md:p-6">
                <div className="mx-auto max-w-3xl">
                    <ErrorState
                        title={t("errors.title")}
                        description={t("errors.description")}
                        retryLabel={t("errors.retry")}
                        onRetry={() => {
                            void subscription.refetch();
                            void invoices.refetch();
                        }}
                    />
                </div>
            </div>
        );
    }

    if (!subscription.isSuccess || !invoices.isSuccess) return <BillingSkeleton />;

    const current = subscription.data;
    // ARCHITECT: одно ожидание на все действия: две одновременные операции над подпиской
    // конфликтовали бы друг с другом, поэтому кнопки блокируются целиком.
    const isPending = Object.values(mutations).some((mutation) => mutation.isPending);

    return (
        <div className="min-h-screen bg-black p-4 md:p-6">
            <div className="mx-auto max-w-3xl space-y-4">
                <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("page.title")}</h1>

                {current.status === "past_due" && (
                    <PastDueBanner
                        onRetry={() => mutations.retry.mutate()}
                        isPending={mutations.retry.isPending}
                    />
                )}

                <CurrentPlanCard
                    subscription={current}
                    isPending={isPending}
                    actions={{
                        upgrade: () => mutations.checkout.mutate(),
                        payNow: () => mutations.convert.mutate(),
                        retry: () => mutations.retry.mutate(),
                        cancel: () => mutations.cancel.mutate(),
                        resume: () => mutations.resume.mutate(),
                        downgrade: () => mutations.downgrade.mutate(),
                        undoDowngrade: () => mutations.undoDowngrade.mutate(),
                    }}
                />

                <UsageMeter usage={current.usage} />
                <InvoicesList invoices={invoices.data} />

                {DevBillingPanel !== null && (
                    <Suspense fallback={null}>
                        <DevBillingPanel />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
