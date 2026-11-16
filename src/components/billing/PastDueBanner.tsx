// ARCHITECT: предупреждение о неудачной оплате — отдельная полоса над карточкой тарифа, а не тост:
// состояние держится до исправления, поэтому его нельзя показать сообщением, которое исчезнет.
// Семантика предупреждения — текст плюс тонкий маркер, без заливки.

import { useTranslation } from "react-i18next";

interface PastDueBannerProps {
    onRetry: () => void;
    isPending: boolean;
}

export function PastDueBanner({ onRetry, isPending }: PastDueBannerProps) {
    const { t } = useTranslation("billing");

    return (
        <aside role="alert" className="rounded-2xl bg-[#111113] p-5">
            <div className="flex items-start gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-medium text-[#f0f0f5]">{t("pastDue.title")}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#f0f0f5]/50">
                        {t("pastDue.description")}
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={isPending}
                        aria-busy={isPending}
                        className="mt-3 min-h-11 rounded-lg bg-[#f0f0f5] px-3 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t("actions.retry")}
                    </button>
                </div>
            </div>
        </aside>
    );
}
