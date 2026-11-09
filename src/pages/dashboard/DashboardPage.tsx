// ARCHITECT: Главная страница дашборда со статистикой и прогрессом.
// Переведена на русский: все виджеты, заголовки, кнопки.

import { motion } from 'framer-motion';
import { BookOpen, Flame, TrendingUp, Clock, Award, ChevronRight } from 'lucide-react';
import { MOCK_USER_PROGRESS, MOCK_VOCABULARY, MOCK_LESSON_HISTORY } from '@/api/mocks/progress';
import { MOCK_REPETITORS } from '@/api/mocks/repetitors';
import { MOCK_SESSIONS } from '@/api/mocks/sessions';
import type { LearningMode } from '@/types/onboarding';
import { cn } from '@/lib/utils';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function DashboardPage() {
    const progress = MOCK_USER_PROGRESS;
    const recentSessions = MOCK_SESSIONS.slice(0, 3);

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Шапка */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[#f0f0f5]">
                        С возвращением, Алекс 👋
                    </h1>
                    <p className="mt-1 text-[#f0f0f5]/50">
                        Продолжи свой путь к свободному английскому
                    </p>
                </motion.div>

                {/* Сетка статистики */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        icon={Flame}
                        label="Дней подряд"
                        value={`${progress.streakDays} дней`}
                        color="orange"
                    />
                    <StatCard
                        icon={BookOpen}
                        label="Выучено слов"
                        value={`${progress.modeProgress.interview.wordsLearned + progress.modeProgress.speaking.wordsLearned}`}
                        color="teal"
                    />
                    <StatCard
                        icon={Clock}
                        label="Время обучения"
                        value={`${progress.totalStudyMinutes} мин`}
                        color="blue"
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Текущий уровень"
                        value={progress.currentLevel}
                        color="purple"
                    />
                </motion.div>

                {/* Основная сетка контента */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Левая колонка — прогресс и активность */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Обзор прогресса */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#f0f0f5]">
                                    Прогресс обучения
                                </h2>
                                <span className="text-sm text-[#f0f0f5]/50">
                                    {progress.currentLevel} → {progress.targetLevel}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {(Object.entries(progress.modeProgress) as [LearningMode, typeof progress.modeProgress[LearningMode]][]).map(
                                    ([modeId, modeData]) => {
                                        const repetitor = MOCK_REPETITORS.find((r) =>
                                            r.specialties.includes(modeId)
                                        );

                                        return (
                                            <div key={modeId} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="size-2 rounded-full"
                                                            style={{ backgroundColor: repetitor?.avatarColor ?? '#8B5CF6' }}
                                                        />
                                                        <span className="capitalize text-[#f0f0f5]">{modeId}</span>
                                                    </div>
                                                    <span className="text-[#f0f0f5]/50">{modeData.progress}%</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${modeData.progress}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-[#f0f0f5]/60 to-[#f0f0f5]"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </motion.div>

                        {/* График активности за неделю */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <h2 className="mb-6 text-lg font-semibold text-[#f0f0f5]">
                                Активность за неделю
                            </h2>

                            <div className="flex items-end justify-between gap-2">
                                {progress.weeklyActivity.map((day, index) => {
                                    const maxMinutes = Math.max(...progress.weeklyActivity.map((d) => d.minutesStudied));
                                    const height = (day.minutesStudied / maxMinutes) * 100;
                                    const dayName = new Date(day.date).toLocaleDateString('ru', { weekday: 'short' });

                                    return (
                                        <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                            <div className="relative w-full" style={{ height: '120px' }}>
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    transition={{ duration: 0.6, delay: index * 0.05 }}
                                                    className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-[#f0f0f5]/20 to-[#f0f0f5]/60"
                                                />
                                            </div>
                                            <span className="text-xs text-[#f0f0f5]/40">{dayName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Последние уроки */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#f0f0f5]">
                                    Последние уроки
                                </h2>
                                <button className="flex items-center gap-1 text-sm text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]">
                                    Смотреть все
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {MOCK_LESSON_HISTORY.slice(0, 3).map((lesson) => (
                                    <div
                                        key={lesson.id}
                                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 items-center justify-center rounded-lg bg-white/5">
                                                <BookOpen className="size-5 text-[#f0f0f5]/60" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-[#f0f0f5]">{lesson.topic}</p>
                                                <p className="text-xs capitalize text-[#f0f0f5]/40">
                                                    {lesson.modeId} · {lesson.duration} мин
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-[#f0f0f5]">
                                                {lesson.score}%
                                            </p>
                                            <p className="text-xs text-[#f0f0f5]/40">
                                                {new Date(lesson.completedAt).toLocaleDateString('ru')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Правая колонка — словарь и достижения */}
                    <div className="space-y-6">
                        {/* Превью словаря */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-[#f0f0f5]">
                                    Словарь
                                </h2>
                                <button className="text-sm text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5]">
                                    Повторить
                                </button>
                            </div>

                            <div className="space-y-2">
                                {MOCK_VOCABULARY.slice(0, 5).map((word) => (
                                    <div
                                        key={word.id}
                                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                                    >
                                        <div>
                                            <p className="font-medium text-[#f0f0f5]">{word.word}</p>
                                            <p className="text-xs text-[#f0f0f5]/40">{word.translation}</p>
                                        </div>
                                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/5">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                                                style={{ width: `${word.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Достижения */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                        >
                            <h2 className="mb-4 text-lg font-semibold text-[#f0f0f5]">
                                Достижения
                            </h2>

                            <div className="space-y-3">
                                {progress.achievements.map((achievement) => (
                                    <div
                                        key={achievement.id}
                                        className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                                    >
                                        <div
                                            className={cn(
                                                'flex size-10 items-center justify-center rounded-lg',
                                                achievement.unlockedAt
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-white/5 text-[#f0f0f5]/30'
                                            )}
                                        >
                                            <Award className="size-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[#f0f0f5]">
                                                {achievement.name}
                                            </p>
                                            <p className="text-xs text-[#f0f0f5]/40">
                                                {achievement.description}
                                            </p>
                                            {!achievement.unlockedAt && (
                                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                                                    <div
                                                        className="h-full rounded-full bg-amber-500/60"
                                                        style={{ width: `${achievement.progress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Продолжить обучение */}
                        <motion.div
                            variants={itemVariants}
                            className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6"
                        >
                            <h3 className="mb-2 text-lg font-semibold text-[#f0f0f5]">
                                Продолжить обучение
                            </h3>
                            <p className="mb-4 text-sm text-[#f0f0f5]/50">
                                Вернись к тому, на чём остановился
                            </p>
                            {recentSessions.slice(0, 2).map((session) => {
                                const repetitor = MOCK_REPETITORS.find(
                                    (r) => r.id === session.repetitorId
                                );

                                return (
                                    <a
                                        key={session.id}
                                        href={`/app/chat/${session.id}`}
                                        className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 transition-colors hover:bg-black/40"
                                    >
                                        <div
                                            className="size-8 rounded-full"
                                            style={{ backgroundColor: repetitor?.avatarColor ?? '#8B5CF6' }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[#f0f0f5]">
                                                {session.title}
                                            </p>
                                            <p className="text-xs capitalize text-[#f0f0f5]/40">
                                                {session.learningMode}
                                            </p>
                                        </div>
                                        <ChevronRight className="size-4 text-[#f0f0f5]/40" />
                                    </a>
                                );
                            })}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Карточка статистики
interface StatCardProps {
    icon: typeof Flame;
    label: string;
    value: string;
    color: 'orange' | 'teal' | 'blue' | 'purple';
}

const COLOR_MAP = {
    orange: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
    },
    teal: {
        bg: 'bg-teal-500/10',
        text: 'text-teal-400',
    },
    blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
    },
    purple: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
    },
};

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
    const colors = COLOR_MAP[color];

    return (
        <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
            <div className="flex items-center gap-3">
                <div className={cn('flex size-12 items-center justify-center rounded-xl', colors.bg)}>
                    <Icon className={cn('size-6', colors.text)} />
                </div>
                <div>
                    <p className="text-sm text-[#f0f0f5]/50">{label}</p>
                    <p className="text-2xl font-bold text-[#f0f0f5]">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}