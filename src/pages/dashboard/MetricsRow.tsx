// ARCHITECT: четыре метрики «Обзора» — только измеримые: сессии, свои сообщения, слова и серия дней. Минуты
// практики и достижения из схемы убраны: их в данных нет, а показывать выдуманные числа нельзя. Две колонки на
// телефоне и четыре с lg; иконки без цветных плиток, значения tabular-nums.

import { BookOpen, Flame, Layers, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProgressDto } from "@/api/progress";

interface MetricsRowProps {
    readonly progress: ProgressDto;
}

export function MetricsRow({ progress }: MetricsRowProps) {
    const { t } = useTranslation("dashboard");

    const metrics = [
        {
            id: "sessions",
            icon: Layers,
            label: t("overview.metrics.sessions"),
            value: progress.sessionsTotal,
        },
        {
            id: "messages",
            icon: MessageSquare,
            label: t("overview.metrics.messages"),
            value: progress.messagesTotal,
        },
        {
            id: "words",
            icon: BookOpen,
            label: t("overview.metrics.words"),
            value: progress.wordsTotal,
        },
        {
            id: "streak",
            icon: Flame,
            label: t("overview.metrics.streak"),
            value: progress.streakDays,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metrics.map((metric) => (
                <div key={metric.id} className="rounded-xl bg-[#141416] p-4 md:p-5">
                    <div className="flex items-center gap-2 text-[#f0f0f5]/40">
                        <metric.icon
                            className="size-4 shrink-0"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        <p className="truncate text-xs">{metric.label}</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-[#f0f0f5]">
                        {metric.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
