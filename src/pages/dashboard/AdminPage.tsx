// ARCHITECT: Админ-панель — цвета используются точечно для наглядности:
// статусы пользователей/тикетов, приоритеты, критические метрики.
// Остальной интерфейс — монохромный.

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Users,
    MessageSquare,
    TrendingUp,
    AlertCircle,
    Search,
    Download,
    MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    name: string;
    email: string;
    plan: "free" | "pro";
    status: "active" | "suspended" | "pending";
    lastActive: string;
    issues: number;
}

interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    subject: string;
    priority: "low" | "medium" | "high";
    status: "open" | "in-progress" | "resolved";
    createdAt: string;
}

const MOCK_USERS: User[] = [
    { id: "user_1", name: "Алекс Разработчик", email: "alex@blobus.ai", plan: "pro", status: "active", lastActive: "2026-11-10T14:30:00Z", issues: 0 },
    { id: "user_2", name: "Мария Иванова", email: "maria@example.com", plan: "pro", status: "active", lastActive: "2026-11-10T12:15:00Z", issues: 2 },
    { id: "user_3", name: "Иван Смирнов", email: "ivan@example.com", plan: "free", status: "active", lastActive: "2026-11-09T18:45:00Z", issues: 0 },
    { id: "user_4", name: "Сара Уильямс", email: "sarah@example.com", plan: "pro", status: "active", lastActive: "2026-11-10T09:20:00Z", issues: 1 },
    { id: "user_5", name: "Дмитрий Козлов", email: "dmitry@example.com", plan: "pro", status: "suspended", lastActive: "2026-11-05T16:10:00Z", issues: 5 },
];

const MOCK_TICKETS: SupportTicket[] = [
    { id: "ticket_1", userId: "user_2", userName: "Мария Иванова", subject: "Не работает коррекция грамматики", priority: "high", status: "open", createdAt: "2026-11-10T10:30:00Z" },
    { id: "ticket_2", userId: "user_4", userName: "Сара Уильямс", subject: "Не могу добавить члена команды", priority: "medium", status: "in-progress", createdAt: "2026-11-09T15:20:00Z" },
    { id: "ticket_3", userId: "user_3", userName: "Иван Смирнов", subject: "Вопрос по повторению слов", priority: "low", status: "resolved", createdAt: "2026-11-08T11:45:00Z" },
];

// ARCHITECT: мягкие цвета — приглушённые, не кислотные.
// Используются только для статусов и приоритетов.
const STATUS_COLORS = {
    active: { bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-400" },
    suspended: { bg: "bg-rose-500/15", text: "text-rose-300", dot: "bg-rose-400" },
    pending: { bg: "bg-amber-500/15", text: "text-amber-300", dot: "bg-amber-400" },
} as const;

const TICKET_STATUS_COLORS = {
    open: { bg: "bg-sky-500/15", text: "text-sky-300" },
    "in-progress": { bg: "bg-amber-500/15", text: "text-amber-300" },
    resolved: { bg: "bg-emerald-500/15", text: "text-emerald-300" },
} as const;

const PRIORITY_COLORS = {
    high: { bg: "bg-rose-500/15", text: "text-rose-300" },
    medium: { bg: "bg-amber-500/15", text: "text-amber-300" },
    low: { bg: "bg-white/5", text: "text-[#f0f0f5]/60" },
} as const;

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
    open: "Открыт",
    "in-progress": "В работе",
    resolved: "Решён",
};

const USER_STATUS_LABELS: Record<User["status"], string> = {
    active: "Активен",
    suspended: "Заблокирован",
    pending: "Ожидает",
};

export function AdminPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPlan, setFilterPlan] = useState<string>("all");

    const filteredUsers = MOCK_USERS.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterPlan === "all" || user.plan === filterPlan;
        return matchesSearch && matchesFilter;
    });

    const metrics = [
        { icon: Users, label: "Пользователей", value: "1 247", accent: "text-sky-300", accentBg: "bg-sky-500/15" },
        { icon: TrendingUp, label: "Активных сегодня", value: "892", accent: "text-emerald-300", accentBg: "bg-emerald-500/15" },
        { icon: MessageSquare, label: "Открытых тикетов", value: "23", accent: "text-amber-300", accentBg: "bg-amber-500/15" },
        { icon: AlertCircle, label: "Критических", value: "3", accent: "text-rose-300", accentBg: "bg-rose-500/15" },
    ];

    return (
        <div className="min-h-screen bg-black p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Админ</h1>
                </motion.header>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {metrics.map((metric) => (
                            <div key={metric.label} className="rounded-xl bg-[#141416] p-4">
                                <div className="mb-3 flex items-center gap-3">
                                    <div className={cn("flex size-10 items-center justify-center rounded-lg", metric.accentBg)}>
                                        <metric.icon className={cn("size-4", metric.accent)} strokeWidth={1.5} />
                                    </div>
                                </div>
                                <p className="text-2xl font-semibold tabular-nums text-[#f0f0f5]">{metric.value}</p>
                                <p className="mt-0.5 text-[11px] text-[#f0f0f5]/40">{metric.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-medium text-[#f0f0f5]/80">Последние тикеты</h2>
                            <button className="text-xs text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70">Все</button>
                        </div>

                        <div className="space-y-2">
                            {MOCK_TICKETS.map((ticket) => {
                                const statusColor = TICKET_STATUS_COLORS[ticket.status];
                                const priorityColor = PRIORITY_COLORS[ticket.priority];

                                return (
                                    <div
                                        key={ticket.id}
                                        className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3 transition-colors hover:bg-[#1a1a1c]"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-medium text-[#f0f0f5]">{ticket.subject}</p>
                                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", priorityColor.bg, priorityColor.text)}>
                                                    {ticket.priority === "high" ? "Высокий" : ticket.priority === "medium" ? "Средний" : "Низкий"}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-[#f0f0f5]/40">
                                                {ticket.userName} · {new Date(ticket.createdAt).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                                            </p>
                                        </div>
                                        <div className="ml-4 flex items-center gap-3">
                                            <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", statusColor.bg, statusColor.text)}>
                                                {STATUS_LABELS[ticket.status]}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label="Действия с тикетом"
                                                className="flex size-7 items-center justify-center rounded-lg text-[#f0f0f5]/40 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]/70"
                                            >
                                                <MoreHorizontal className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-medium text-[#f0f0f5]/80">Пользователи</h2>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 rounded-lg bg-[#f0f0f5] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#f0f0f5]/90"
                            >
                                <Download className="size-3.5" />
                                Экспорт
                            </button>
                        </div>

                        <div className="mb-4 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/30" />
                                <input
                                    type="text"
                                    placeholder="Поиск"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    aria-label="Поиск пользователей"
                                    className="w-full rounded-lg bg-[#141416] py-2 pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-[#f0f0f5]/30 focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20"
                                />
                            </div>
                            <select
                                value={filterPlan}
                                onChange={(e) => setFilterPlan(e.target.value)}
                                aria-label="Фильтр по тарифу"
                                className="rounded-lg bg-[#141416] px-3 py-2 text-sm text-[#f0f0f5] focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20"
                            >
                                <option value="all">Все тарифы</option>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            {filteredUsers.map((user) => {
                                const statusColor = STATUS_COLORS[user.status];

                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[#141416]"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[#f0f0f5]">{user.name}</p>
                                            <p className="text-xs text-[#f0f0f5]/40">{user.email}</p>
                                        </div>
                                        <div className="ml-4 flex items-center gap-3">
                                            <span className={cn("text-[11px] font-medium uppercase", user.plan === "pro" ? "text-[#f0f0f5]/70" : "text-[#f0f0f5]/40")}>
                                                {user.plan}
                                            </span>
                                            <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", statusColor.bg, statusColor.text)}>
                                                <span className={cn("size-1.5 rounded-full", statusColor.dot)} />
                                                {USER_STATUS_LABELS[user.status]}
                                            </span>
                                            {user.issues > 0 && (
                                                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-rose-300">
                                                    {user.issues}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}