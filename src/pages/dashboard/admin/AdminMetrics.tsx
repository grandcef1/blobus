// ARCHITECT: числа админ-панели. Цветные плитки под иконками убраны: цвет в палитре проекта
// зарезервирован под действия и состояния, а не под декор метрик.

import { AlertCircle, MessageSquare, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

// ARCHITECT: массив хранит ключи, а не подписи: t() резолвит их в рендере, поэтому смена языка обновляет метрики.
const METRICS = [
    { id: "users", icon: Users, labelKey: "admin.metrics.users", value: "1 247" },
    { id: "active", icon: TrendingUp, labelKey: "admin.metrics.active", value: "892" },
    { id: "tickets", icon: MessageSquare, labelKey: "admin.metrics.tickets", value: "23" },
    { id: "critical", icon: AlertCircle, labelKey: "admin.metrics.critical", value: "3" },
] as const;

export function AdminMetrics() {
    const { t } = useTranslation("dashboard");

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRICS.map((metric) => (
                <div key={metric.id} className="rounded-xl bg-[#141416] p-4">
                    <div className="flex items-center gap-2 text-[#f0f0f5]/40">
                        <metric.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <p className="truncate text-[11px]">{t(metric.labelKey)}</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-[#f0f0f5]">{metric.value}</p>
                </div>
            ))}
        </div>
    );
}
