// ARCHITECT: Две шкалы вместо одной: лимиты дневные, оба счётчика сбрасываются по UTC-дате; null-ветки
// убраны, потому что безлимитных тарифов нет (Plan.messagesLimit и Plan.lessonsLimit всегда числа).
// Значения — tabular-nums: цифры не дёргаются при обновлении.

import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import type { SubscriptionUsage } from "@/types/billing";

interface UsageMeterProps {
    usage: SubscriptionUsage;
}

interface UsageMeterRowProps {
    readonly label: string;
    readonly used: number;
    readonly limit: number;
}

/** Одна шкала расхода: подпись, счётчик «X из Y» и полоса с процентом заполнения. */
function UsageMeterRow({ label, used, limit }: UsageMeterRowProps) {
    const { t } = useTranslation("billing");
    const share = Math.min(100, Math.round((used / limit) * 100));

    return (
        <div className="mt-4">
            <div className="flex items-baseline justify-between gap-4">
                <p className="text-xs text-[#f0f0f5]/40">{label}</p>
                <span className="text-sm tabular-nums text-[#f0f0f5]/60">
                    {t("usage.counter", { used, limit })}
                </span>
            </div>
            <Progress className="mt-2" value={share} aria-label={label} />
        </div>
    );
}

export function UsageMeter({ usage }: UsageMeterProps) {
    const { t } = useTranslation("billing");

    return (
        <section className="rounded-2xl bg-[#111113] p-5">
            <h2 className="text-base font-medium text-[#f0f0f5]/80">{t("usage.title")}</h2>
            <UsageMeterRow
                label={t("usage.lessons")}
                used={usage.lessonsUsed}
                limit={usage.lessonsLimit}
            />
            <UsageMeterRow
                label={t("usage.messages")}
                used={usage.messagesUsed}
                limit={usage.messagesLimit}
            />
        </section>
    );
}
