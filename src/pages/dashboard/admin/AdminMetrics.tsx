// ARCHITECT: числа админ-панели. Цветные плитки под иконками убраны: цвет в палитре проекта
// зарезервирован под действия и состояния, а не под декор метрик.

import { AlertCircle, MessageSquare, TrendingUp, Users } from "lucide-react";

const METRICS = [
    { id: "users", icon: Users, label: "Пользователей", value: "1 247" },
    { id: "active", icon: TrendingUp, label: "Активных сегодня", value: "892" },
    { id: "tickets", icon: MessageSquare, label: "Открытых тикетов", value: "23" },
    { id: "critical", icon: AlertCircle, label: "Критических", value: "3" },
];

export function AdminMetrics() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METRICS.map((metric) => (
                <div key={metric.id} className="rounded-xl bg-[#141416] p-4">
                    <div className="flex items-center gap-2 text-[#f0f0f5]/40">
                        <metric.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <p className="truncate text-[11px]">{metric.label}</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-[#f0f0f5]">{metric.value}</p>
                </div>
            ))}
        </div>
    );
}
