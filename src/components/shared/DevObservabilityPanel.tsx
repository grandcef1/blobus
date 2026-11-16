// ARCHITECT: панель разработки наблюдаемости. Существует только в dev-сборке (вызывается условно из
// App.tsx), показывает состояние гейта согласия и счётчик отчётов: иначе проверить, грузится ли
// Sentry и уходят ли отчёты, можно только по журналу сервера.
// ARCHITECT: хук useSyncExternalStore читает счётчик из наблюдаемого модуля — отчёты отправляются
// вне React и обычный state их бы не увидел.

import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
    getSentReportCount,
    isSentryActive,
    subscribeObservability,
} from "@/lib/observability/report-error";
import { useConsentStore } from "@/store/consent";
import { toast } from "@/store/toast";

const BUTTON = "min-h-11 rounded-lg border border-white/15 px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function DevObservabilityPanel() {
    const { t } = useTranslation();
    const analytics = useConsentStore((state) => state.analytics);
    const resetDecision = useConsentStore((state) => state.resetDecision);
    const sentCount = useSyncExternalStore(subscribeObservability, getSentReportCount);
    const sentryActive = useSyncExternalStore(subscribeObservability, isSentryActive);

    if (!import.meta.env.DEV) return null;

    // ARCHITECT: ошибка бросается из таймера, как настоящая: window "error" ловит её и отдаёт в
    // reportError — так проверяется весь путь, а не прямой вызов отчёта.
    const throwTestError = (): void => {
        window.setTimeout(() => {
            throw new Error("Blobus: test error");
        }, 0);
    };

    const rejectTestPromise = (): void => {
        void Promise.reject(new Error("Blobus: test rejected promise"));
    };

    const handleReset = (): void => {
        resetDecision();
        toast.info(t("dev.observability.resetDone"));
    };

    const rows = [
        { label: t("dev.observability.consent"), value: t(analytics ? "dev.observability.on" : "dev.observability.off") },
        { label: t("dev.observability.sentry"), value: t(sentryActive ? "dev.observability.on" : "dev.observability.off") },
        { label: t("dev.observability.reports"), value: String(sentCount) },
    ];

    return (
        <aside className="fixed bottom-4 left-4 z-50 w-64 rounded-2xl border border-dashed border-white/10 bg-black/80 p-5 backdrop-blur-md">
            <h2 className="text-xs uppercase tracking-wider text-[#f0f0f5]/40">
                {t("dev.observability.title")}
            </h2>

            <dl className="mt-3 space-y-1 text-xs text-[#f0f0f5]/60">
                {rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                        <dt>{row.label}</dt>
                        <dd className="tabular-nums text-[#f0f0f5]/80">{row.value}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={throwTestError} className={BUTTON}>
                    {t("dev.observability.throwError")}
                </button>
                <button type="button" onClick={rejectTestPromise} className={BUTTON}>
                    {t("dev.observability.rejectPromise")}
                </button>
                <button type="button" onClick={handleReset} className={BUTTON}>
                    {t("dev.observability.reset")}
                </button>
            </div>
        </aside>
    );
}
