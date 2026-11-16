// ARCHITECT: панель ошибки загрузки — короткая строка и повтор, без иллюстрации: пользователю нужно
// понимать, что экран не пустой, а запрос не прошёл.

import { useTranslation } from "react-i18next";

interface BillingErrorPanelProps {
    onRetry: () => void;
}

export function BillingErrorPanel({ onRetry }: BillingErrorPanelProps) {
    const { t } = useTranslation("billing");

    return (
        <section role="alert" className="rounded-2xl bg-[#111113] p-5">
            <h1 className="text-sm font-medium text-[#f0f0f5]">{t("errors.title")}</h1>
            <p className="mt-1 text-xs leading-relaxed text-[#f0f0f5]/50">{t("errors.description")}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-3 min-h-11 rounded-lg border border-white/15 px-3 text-sm text-[#f0f0f5] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
            >
                {t("errors.retry")}
            </button>
        </section>
    );
}
