// ARCHITECT: Страница управления подпиской.
// Данные синхронизированы с лендингом (src/components/landing/pricing/data.ts):
// - Blobus Free: $0/месяц, $0/год, 1 урок в день
// - Blobus Pro: $3/месяц, $29/год (безлимит + премиум-голос)

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Sparkles, Calendar, Download, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ARCHITECT: Типы синхронизированы с лендингом
type PlanId = 'free' | 'pro';
type BillingPeriod = 'month' | 'year';

interface PlanFeature {
    text: string;
    freeIncluded: boolean;
    proIncluded: boolean;
    freeLimit?: string;
}

interface BillingPlan {
    id: PlanId;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    cta: string;
    ctaSecondary: string;
    highlighted: boolean;
    current?: boolean;
}

interface PaymentHistory {
    id: string;
    date: string;
    amount: number;
    plan: string;
    status: 'paid' | 'pending' | 'failed';
}

// ARCHITECT: Единый список фич — порядок идентичен лендингу
const FEATURES: readonly PlanFeature[] = [
    {
        text: 'Уроки с ИИ-репетитором',
        freeIncluded: true,
        proIncluded: true,
        freeLimit: '1 в день',
    },
    {
        text: 'Все режимы обучения',
        freeIncluded: true,
        proIncluded: true,
    },
    {
        text: 'Персонализация и память',
        freeIncluded: true,
        proIncluded: true,
    },
    {
        text: 'Премиум-голос ИИ',
        freeIncluded: false,
        proIncluded: true,
    },
    {
        text: 'Безлимит уроков',
        freeIncluded: false,
        proIncluded: true,
    },
] as const;

// ARCHITECT: Тарифы с лендинга. Pro — highlighted, Free — базовый.
const BILLING_PLANS: BillingPlan[] = [
    {
        id: 'free',
        name: 'Blobus Free',
        description: 'Для знакомства с платформой и регулярной практики',
        monthlyPrice: 0,
        yearlyPrice: 0,
        cta: 'Текущий план',
        ctaSecondary: '',
        highlighted: false,
        current: true, // ARCHITECT: пользователь сейчас на Free
    },
    {
        id: 'pro',
        name: 'Blobus Pro',
        description: 'Для тех, кто хочет учиться без ограничений',
        monthlyPrice: 3,
        yearlyPrice: 29,
        cta: 'Попробовать 7 дней',
        ctaSecondary: 'Без привязки карты',
        highlighted: true,
        current: false,
    },
];

const MOCK_PAYMENT_HISTORY: PaymentHistory[] = [
    { id: 'pay_1', date: '2026-11-01', amount: 0, plan: 'Free', status: 'paid' },
    { id: 'pay_2', date: '2026-10-01', amount: 0, plan: 'Free', status: 'paid' },
];

export function BillingPage() {
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('month');

    // ARCHITECT: вычисляем цену с учётом периода
    const getPrice = (plan: BillingPlan): number => {
        return billingPeriod === 'month' ? plan.monthlyPrice : plan.yearlyPrice;
    };

    const getPeriodLabel = (): string => {
        return billingPeriod === 'month' ? '/мес' : '/год';
    };

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <h1 className="text-3xl font-bold text-[#f0f0f5] md:text-4xl">
                        Подписка и оплата
                    </h1>
                    <p className="mt-2 text-[#f0f0f5]/50">
                        Управляйте тарифом, просматривайте историю платежей
                    </p>
                </motion.header>

                {/* ARCHITECT: Асимметричная сетка — текущий план крупнее, upgrade карточка рядом */}
                <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                    {/* Current Plan Banner */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8"
                    >
                        {/* ARCHITECT: фоновый градиент для глубины */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                background:
                                    'radial-gradient(circle at 85% 15%, rgba(240,240,245,0.08) 0%, transparent 50%)',
                            }}
                            aria-hidden="true"
                        />

                        <div className="relative">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
                                    <Sparkles className="size-4 text-[#f0f0f5]/70" />
                                </div>
                                <span className="text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/50">
                                    Ваш текущий план
                                </span>
                            </div>

                            <h2 className="mb-2 text-3xl font-bold text-[#f0f0f5] md:text-4xl">
                                Blobus Free
                            </h2>
                            <p className="mb-6 max-w-md text-[#f0f0f5]/60">
                                Для знакомства с платформой и регулярной практики. 1 урок в день с
                                ИИ-репетитором.
                            </p>

                            <div className="mb-6 flex items-end gap-2">
                                <span className="text-5xl font-bold text-[#f0f0f5]">$0</span>
                                <span className="pb-2 text-sm text-[#f0f0f5]/50">/месяц</span>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-[#f0f0f5] transition-all hover:border-white/40 hover:bg-white/[0.08]">
                                    Сменить план
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                                <button className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-[#f0f0f5]/50 transition-colors hover:border-white/20 hover:text-[#f0f0f5]/70">
                                    История платежей
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* ARCHITECT: Карточка-апгрейд с бесконечным border-градиентом (как на лендинге) */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                    >
                        {/* Бейдж "Непревзойденная цена" */}
                        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/80 px-3 py-1 text-[11px] font-medium text-[#f0f0f5] shadow-lg backdrop-blur-sm">
                                <Sparkles className="size-3" />
                                Рекомендовано
                            </span>
                        </div>

                        {/* ARCHITECT: фоновое свечение */}
                        <div
                            className="absolute -inset-4 rounded-3xl opacity-40"
                            style={{
                                background:
                                    'radial-gradient(circle at 50% 50%, rgba(240,240,245,0.15) 0%, transparent 65%)',
                            }}
                            aria-hidden="true"
                        />

                        <div className="relative overflow-hidden rounded-2xl p-[1.5px]">
                            {/* ARCHITECT: вращающийся градиент — идентичен лендингу */}
                            <motion.div
                                className="absolute inset-0 rounded-2xl"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    background:
                                        'conic-gradient(from 0deg, transparent 0%, rgba(240,240,245,0.2) 25%, rgba(240,240,245,0.9) 50%, rgba(240,240,245,0.2) 75%, transparent 100%)',
                                }}
                                aria-hidden="true"
                            />
                            <div className="absolute inset-[1.5px] rounded-2xl bg-black" />

                            <div className="relative z-10 p-6">
                                <h3 className="mb-1 text-xl font-bold text-[#f0f0f5]">Blobus Pro</h3>
                                <p className="mb-4 text-sm text-[#f0f0f5]/60">
                                    Безлимит уроков и премиум-голос
                                </p>

                                <div className="mb-5 flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-[#f0f0f5]">$3</span>
                                    <span className="text-sm text-[#f0f0f5]/50">/мес</span>
                                </div>

                                <ul className="mb-5 space-y-2">
                                    {FEATURES.filter((f) => f.proIncluded && !f.freeIncluded).map(
                                        (feature) => (
                                            <li
                                                key={feature.text}
                                                className="flex items-center gap-2 text-xs text-[#f0f0f5]/70"
                                            >
                                                <Check className="size-3.5 shrink-0 text-[#f0f0f5]" />
                                                {feature.text}
                                            </li>
                                        )
                                    )}
                                </ul>

                                <button className="w-full rounded-full bg-[#f0f0f5] py-2.5 text-sm font-semibold text-black transition-all hover:bg-white hover:shadow-[0_0_30px_rgba(240,240,245,0.3)]">
                                    Попробовать 7 дней бесплатно
                                </button>
                                <p className="mt-2 text-center text-[11px] text-[#f0f0f5]/40">
                                    Без привязки карты · Отмена в любой момент
                                </p>
                            </div>
                        </div>
                    </motion.section>
                </div>

                {/* Billing Period Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8 flex justify-center"
                >
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.02] p-1">
                        <button
                            onClick={() => setBillingPeriod('month')}
                            className={cn(
                                'rounded-full px-6 py-2 text-sm font-medium transition-all',
                                billingPeriod === 'month'
                                    ? 'bg-[#f0f0f5] text-black'
                                    : 'text-[#f0f0f5]/50 hover:text-[#f0f0f5]'
                            )}
                        >
                            Ежемесячно
                        </button>
                        <button
                            onClick={() => setBillingPeriod('year')}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all',
                                billingPeriod === 'year'
                                    ? 'bg-[#f0f0f5] text-black'
                                    : 'text-[#f0f0f5]/50 hover:text-[#f0f0f5]'
                            )}
                        >
                            Ежегодно
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                −20%
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* Plans Grid */}
                <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {BILLING_PLANS.map((plan, index) => {
                        const price = getPrice(plan);
                        const period = getPeriodLabel();

                        return (
                            <motion.article
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className={cn(
                                    'relative flex h-full flex-col rounded-2xl border p-8 transition-colors',
                                    plan.current
                                        ? 'border-white/20 bg-white/[0.04]'
                                        : plan.highlighted
                                            ? 'border-white/15 bg-white/[0.02]'
                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                )}
                            >
                                {plan.current && (
                                    <div className="absolute right-6 top-6">
                                        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#f0f0f5]/70">
                                            Активен
                                        </span>
                                    </div>
                                )}

                                <h3 className="mb-1 text-xl font-bold text-[#f0f0f5]">{plan.name}</h3>
                                <p className="mb-6 text-sm text-[#f0f0f5]/50">{plan.description}</p>

                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-[#f0f0f5]">${price}</span>
                                    <span className="text-sm text-[#f0f0f5]/50">{period}</span>
                                </div>

                                {billingPeriod === 'year' && plan.yearlyPrice > 0 && (
                                    <p className="mb-4 text-xs text-[#f0f0f5]/40">
                                        ${Math.round(plan.yearlyPrice / 12)}/мес при оплате за год
                                    </p>
                                )}

                                {/* Feature List */}
                                <ul className="mb-8 flex-1 space-y-0">
                                    {FEATURES.map((feature, idx) => {
                                        const isIncluded =
                                            plan.id === 'free' ? feature.freeIncluded : feature.proIncluded;
                                        const limit =
                                            plan.id === 'free' ? feature.freeLimit : undefined;
                                        const isLast = idx === FEATURES.length - 1;

                                        return (
                                            <li key={feature.text}>
                                                <div className="flex items-center gap-3 py-3">
                                                    <span className="shrink-0">
                                                        {isIncluded ? (
                                                            <Check className="size-4 text-[#f0f0f5]" />
                                                        ) : (
                                                            <X className="size-4 text-[#f0f0f5]/20" />
                                                        )}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'flex-1 text-sm',
                                                            isIncluded ? 'text-[#f0f0f5]/80' : 'text-[#f0f0f5]/30'
                                                        )}
                                                    >
                                                        {feature.text}
                                                        {limit && (
                                                            <span className="ml-1.5 text-xs text-[#f0f0f5]/40">
                                                                · {limit}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                {!isLast && <div className="h-px bg-white/5" aria-hidden="true" />}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button
                                    disabled={plan.current}
                                    className={cn(
                                        'w-full rounded-full py-3 text-sm font-medium transition-all',
                                        plan.current
                                            ? 'border border-white/20 bg-transparent text-[#f0f0f5]/40 cursor-not-allowed'
                                            : plan.highlighted
                                                ? 'bg-[#f0f0f5] text-black hover:bg-white hover:shadow-[0_0_30px_rgba(240,240,245,0.3)]'
                                                : 'border border-white/20 bg-transparent text-[#f0f0f5] hover:border-white/40 hover:bg-white/5'
                                    )}
                                >
                                    {plan.current ? plan.cta : plan.cta}
                                </button>
                                {plan.ctaSecondary && (
                                    <p className="mt-3 text-center text-xs text-[#f0f0f5]/40">
                                        {plan.ctaSecondary}
                                    </p>
                                )}
                            </motion.article>
                        );
                    })}
                </div>

                {/* Payment Methods */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-white/[0.06]">
                                <CreditCard className="size-5 text-[#f0f0f5]/60" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[#f0f0f5]">Способы оплаты</h2>
                                <p className="text-xs text-[#f0f0f5]/40">
                                    Добавьте карту для активации Pro-подписки
                                </p>
                            </div>
                        </div>
                        <button className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-[#f0f0f5] transition-colors hover:border-white/30 hover:bg-white/[0.08]">
                            + Добавить карту
                        </button>
                    </div>

                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                        <CreditCard className="mx-auto mb-3 size-8 text-[#f0f0f5]/20" />
                        <p className="text-sm text-[#f0f0f5]/40">
                            Нет сохранённых способов оплаты
                        </p>
                        <p className="mt-1 text-xs text-[#f0f0f5]/30">
                            Карта потребуется только при переходе на Pro
                        </p>
                    </div>
                </motion.section>

                {/* Payment History */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-white/[0.06]">
                            <Calendar className="size-5 text-[#f0f0f5]/60" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[#f0f0f5]">История платежей</h2>
                            <p className="text-xs text-[#f0f0f5]/40">
                                Все транзакции по вашему аккаунту
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {MOCK_PAYMENT_HISTORY.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-white/[0.04]">
                                        <CreditCard className="size-4 text-[#f0f0f5]/50" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#f0f0f5]">
                                            Подписка {payment.plan}
                                        </p>
                                        <p className="text-xs text-[#f0f0f5]/40">
                                            {new Date(payment.date).toLocaleDateString('ru-RU', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-[#f0f0f5]">
                                            ${payment.amount}
                                        </p>
                                        <span className="text-[10px] capitalize text-emerald-400">
                                            {payment.status === 'paid' ? 'оплачено' : payment.status}
                                        </span>
                                    </div>
                                    <button
                                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5]"
                                        aria-label="Скачать счёт"
                                    >
                                        <Download className="size-3.5" />
                                        PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>
            </div>
        </div>
    );
}