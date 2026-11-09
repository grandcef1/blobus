// ARCHITECT: Админ-панель для управления пользователями и системой поддержки.
// Полностью переведена на русский язык.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquare, TrendingUp, AlertCircle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
    id: string;
    name: string;
    email: string;
    plan: 'free' | 'pro';
    status: 'active' | 'suspended' | 'pending';
    lastActive: string;
    issues: number;
}

interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    subject: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in-progress' | 'resolved';
    createdAt: string;
}

const MOCK_USERS: User[] = [
    {
        id: 'user_1',
        name: 'Алекс Разработчик',
        email: 'alex@blobus.ai',
        plan: 'pro',
        status: 'active',
        lastActive: '2026-11-10T14:30:00Z',
        issues: 0,
    },
    {
        id: 'user_2',
        name: 'Мария Иванова',
        email: 'maria@example.com',
        plan: 'pro',
        status: 'active',
        lastActive: '2026-11-10T12:15:00Z',
        issues: 2,
    },
    {
        id: 'user_3',
        name: 'Иван Смирнов',
        email: 'ivan@example.com',
        plan: 'free',
        status: 'active',
        lastActive: '2026-11-09T18:45:00Z',
        issues: 0,
    },
    {
        id: 'user_4',
        name: 'Сара Уильямс',
        email: 'sarah@example.com',
        plan: 'pro',
        status: 'active',
        lastActive: '2026-11-10T09:20:00Z',
        issues: 1,
    },
    {
        id: 'user_5',
        name: 'Дмитрий Козлов',
        email: 'dmitry@example.com',
        plan: 'pro',
        status: 'suspended',
        lastActive: '2026-11-05T16:10:00Z',
        issues: 5,
    },
];

const MOCK_TICKETS: SupportTicket[] = [
    {
        id: 'ticket_1',
        userId: 'user_2',
        userName: 'Мария Иванова',
        subject: 'Не работает коррекция грамматики',
        priority: 'high',
        status: 'open',
        createdAt: '2026-11-10T10:30:00Z',
    },
    {
        id: 'ticket_2',
        userId: 'user_4',
        userName: 'Сара Уильямс',
        subject: 'Не могу добавить члена команды',
        priority: 'medium',
        status: 'in-progress',
        createdAt: '2026-11-09T15:20:00Z',
    },
    {
        id: 'ticket_3',
        userId: 'user_3',
        userName: 'Иван Смирнов',
        subject: 'Вопрос по повторению слов',
        priority: 'low',
        status: 'resolved',
        createdAt: '2026-11-08T11:45:00Z',
    },
];

// ARCHITECT: русифицированные подписи статусов и приоритетов
const STATUS_LABELS: Record<SupportTicket['status'], string> = {
    open: 'открыт',
    'in-progress': 'в работе',
    resolved: 'решён',
};

const USER_STATUS_LABELS: Record<User['status'], string> = {
    active: 'активен',
    suspended: 'заблокирован',
    pending: 'ожидает',
};

export function AdminPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');

    const filteredUsers = MOCK_USERS.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterPlan === 'all' || user.plan === filterPlan;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Шапка */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[#f0f0f5]">Панель администратора</h1>
                    <p className="mt-1 text-[#f0f0f5]/50">
                        Управление пользователями, тикетами поддержки и аналитикой
                    </p>
                </motion.div>

                {/* Сетка статистики */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={Users}
                        label="Всего пользователей"
                        value="1 247"
                        change="+12%"
                        color="blue"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Активных сегодня"
                        value="892"
                        change="+8%"
                        color="emerald"
                    />
                    <StatCard
                        icon={MessageSquare}
                        label="Открытых тикетов"
                        value="23"
                        change="-5%"
                        color="amber"
                    />
                    <StatCard
                        icon={AlertCircle}
                        label="Критических проблем"
                        value="3"
                        change="0%"
                        color="rose"
                    />
                </div>

                {/* Тикеты поддержки */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Последние тикеты поддержки</h2>
                        <button className="text-sm text-[#f0f0f5]/60 transition-colors hover:text-[#f0f0f5]">
                            Смотреть все
                        </button>
                    </div>

                    <div className="space-y-3">
                        {MOCK_TICKETS.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-lg',
                                            ticket.priority === 'high'
                                                ? 'bg-rose-500/10 text-rose-400'
                                                : ticket.priority === 'medium'
                                                    ? 'bg-amber-500/10 text-amber-400'
                                                    : 'bg-blue-500/10 text-blue-400'
                                        )}
                                    >
                                        <MessageSquare className="size-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[#f0f0f5]">{ticket.subject}</p>
                                        <p className="text-sm text-[#f0f0f5]/50">
                                            {ticket.userName} · {new Date(ticket.createdAt).toLocaleDateString('ru')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            'rounded-full px-3 py-1 text-xs font-medium',
                                            ticket.status === 'open'
                                                ? 'bg-rose-500/10 text-rose-400'
                                                : ticket.status === 'in-progress'
                                                    ? 'bg-amber-500/10 text-amber-400'
                                                    : 'bg-emerald-500/10 text-emerald-400'
                                        )}
                                    >
                                        {STATUS_LABELS[ticket.status]}
                                    </span>
                                    <button className="text-sm text-[#f0f0f5]/60 transition-colors hover:text-[#f0f0f5]">
                                        Открыть
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Управление пользователями */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-[#f0f0f5]">Управление пользователями</h2>
                        <button className="rounded-full bg-[#f0f0f5] px-6 py-2 text-sm font-medium text-black transition-all hover:bg-white">
                            Экспорт пользователей
                        </button>
                    </div>

                    {/* Поиск и фильтры */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/30" />
                            <input
                                type="text"
                                placeholder="Поиск пользователей..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Поиск пользователей"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-[#f0f0f5] placeholder:text-[#f0f0f5]/30 focus:border-white/25 focus:outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="size-4 text-[#f0f0f5]/40" aria-hidden="true" />
                            <select
                                value={filterPlan}
                                onChange={(e) => setFilterPlan(e.target.value)}
                                aria-label="Фильтр по тарифу"
                                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-[#f0f0f5] focus:border-white/25 focus:outline-none"
                            >
                                <option value="all">Все тарифы</option>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                            </select>
                        </div>
                    </div>

                    {/* Таблица пользователей */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Пользователь
                                    </th>
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Тариф
                                    </th>
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Статус
                                    </th>
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Последняя активность
                                    </th>
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Проблемы
                                    </th>
                                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/40">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-white/[0.02]">
                                        <td className="py-4">
                                            <div>
                                                <p className="font-medium text-[#f0f0f5]">{user.name}</p>
                                                <p className="text-sm text-[#f0f0f5]/50">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-medium uppercase',
                                                    user.plan === 'pro'
                                                        ? 'bg-purple-500/10 text-purple-400'
                                                        : 'bg-white/10 text-[#f0f0f5]/60'
                                                )}
                                            >
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span
                                                className={cn(
                                                    'flex items-center gap-1.5 text-sm',
                                                    user.status === 'active'
                                                        ? 'text-emerald-400'
                                                        : user.status === 'suspended'
                                                            ? 'text-rose-400'
                                                            : 'text-amber-400'
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        user.status === 'active'
                                                            ? 'bg-emerald-400'
                                                            : user.status === 'suspended'
                                                                ? 'bg-rose-400'
                                                                : 'bg-amber-400'
                                                    )}
                                                />
                                                {USER_STATUS_LABELS[user.status]}
                                            </span>
                                        </td>
                                        <td className="py-4 text-sm text-[#f0f0f5]/60">
                                            {new Date(user.lastActive).toLocaleDateString('ru')}
                                        </td>
                                        <td className="py-4">
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-1 text-xs font-medium',
                                                    user.issues > 0
                                                        ? 'bg-rose-500/10 text-rose-400'
                                                        : 'bg-white/5 text-[#f0f0f5]/40'
                                                )}
                                            >
                                                {user.issues}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <button className="rounded-lg px-3 py-1.5 text-sm text-[#f0f0f5]/60 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]">
                                                    Изменить
                                                </button>
                                                <button className="rounded-lg px-3 py-1.5 text-sm text-rose-400/60 transition-colors hover:bg-rose-500/10 hover:text-rose-400">
                                                    Заблокировать
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Карточка статистики
interface StatCardProps {
    icon: typeof Users;
    label: string;
    value: string;
    change: string;
    color: 'blue' | 'emerald' | 'amber' | 'rose';
}

const STAT_COLOR_MAP = {
    blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
    },
    amber: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
    },
    rose: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
    },
};

function StatCard({ icon: Icon, label, value, change, color }: StatCardProps) {
    const colors = STAT_COLOR_MAP[color];
    const isPositive = change.startsWith('+');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
            <div className="flex items-center justify-between">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', colors.bg)}>
                    <Icon className={cn('size-6', colors.text)} />
                </div>
                <span
                    className={cn(
                        'text-xs font-medium',
                        isPositive ? 'text-emerald-400' : change === '0%' ? 'text-[#f0f0f5]/40' : 'text-rose-400'
                    )}
                >
                    {change}
                </span>
            </div>
            <div className="mt-4">
                <p className="text-sm text-[#f0f0f5]/50">{label}</p>
                <p className="mt-1 text-2xl font-bold text-[#f0f0f5]">{value}</p>
            </div>
        </motion.div>
    );
}