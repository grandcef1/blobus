// ARCHITECT: расход сообщений показан шкалой только там, где лимит есть: у безлимита шкала была бы
// вымыслом, поэтому вместо неё текст. Значения — tabular-nums: цифры не дёргаются при обновлении.

import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import type { SubscriptionUsage } from "@/types/billing";

interface UsageMeterProps {
    usage: SubscriptionUsage;
}

export function UsageMeter({ usage }: UsageMeterProps) {
    const { t } = useTranslation("billing");
    const { messagesUsed, messagesLimit } = usage;
    const share =
        messagesLimit === null ? 0 : Math.min(100, Math.round((messagesUsed / messagesLimit) * 100));

    return (
        <section className="rounded-2xl bg-[#111113] p-5">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-base font-medium text-[#f0f0f5]/80">{t("usage.title")}</h2>
                <span className="text-sm tabular-nums text-[#f0f0f5]/60">
                    {messagesLimit === null
                        ? t("usage.unlimited")
                        : t("usage.counter", { used: messagesUsed, limit: messagesLimit })}
                </span>
            </div>
            <p className="mt-1 text-xs text-[#f0f0f5]/40">{t("usage.messages")}</p>
            {messagesLimit !== null && (
                <Progress
                    className="mt-4"
                    value={share}
                    aria-label={t("usage.messages")}
                />
            )}
        </section>
    );
}
