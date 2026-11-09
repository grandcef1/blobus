// ARCHITECT: Страница профиля пользователя с детальной статистикой

// ARCHITECT: Страница профиля пользователя с детальной статистикой

import { motion } from 'framer-motion';
import { User, Mail, Calendar, Award, BookOpen, TrendingUp } from 'lucide-react';
import { MOCK_USER_PROGRESS } from '@/api/mocks/progress';
import { MOCK_REPETITORS } from '@/api/mocks/repetitors';
import type { LearningMode } from '@/types/onboarding';

export function ProfilePage() {
    const progress = MOCK_USER_PROGRESS;

    return (
        <div className="min-h-screen bg-black p-6 md:p-8">
            <div className="mx-auto max-w-5xl">
                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-center gap-6"
                >
                    <div className="flex size-24 items-center justify-center rounded-full bg-white/10">
                        <User className="size-12 text-[#f0f0f5]/60" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[#f0f0f5]">Alex Developer</h1>
                        <div className="mt-2 flex items-center gap-4 text-sm text-[#f0f0f5]/50">
                            <span className="flex items-center gap-1">
                                <Mail className="size-4" />
                                alex@blobus.ai
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="size-4" />
                                Joined Nov 2026
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Overview */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="size-8 text-purple-400" />
                            <div>
                                <p className="text-sm text-[#f0f0f5]/50">Current Level</p>
                                <p className="text-2xl font-bold text-[#f0f0f5]">{progress.currentLevel}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                        <div className="flex items-center gap-3">
                            <Award className="size-8 text-amber-400" />
                            <div>
                                <p className="text-sm text-[#f0f0f5]/50">Achievements</p>
                                <p className="text-2xl font-bold text-[#f0f0f5]">
                                    {progress.achievements.filter((a) => a.unlockedAt).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                        <div className="flex items-center gap-3">
                            <BookOpen className="size-8 text-teal-400" />
                            <div>
                                <p className="text-sm text-[#f0f0f5]/50">Total Words</p>
                                <p className="text-2xl font-bold text-[#f0f0f5]">
                                    {Object.values(progress.modeProgress).reduce(
                                        (sum, mode) => sum + mode.wordsLearned,
                                        0
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Learning Modes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                    <h2 className="mb-6 text-xl font-semibold text-[#f0f0f5]">
                        Learning Progress by Mode
                    </h2>

                    <div className="space-y-6">
                        {(Object.entries(progress.modeProgress) as [LearningMode, typeof progress.modeProgress[LearningMode]][]).map(
                            ([modeId, modeData]) => {
                                const repetitor = MOCK_REPETITORS.find((r) =>
                                    r.specialties.includes(modeId)
                                );

                                return (
                                    <div key={modeId} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="size-3 rounded-full"
                                                    style={{ backgroundColor: repetitor?.avatarColor ?? '#8B5CF6' }}
                                                />
                                                <h3 className="text-lg font-medium capitalize text-[#f0f0f5]">
                                                    {modeId}
                                                </h3>
                                            </div>
                                            <span className="text-sm text-[#f0f0f5]/50">
                                                Level {modeData.level} · {modeData.progress}%
                                            </span>
                                        </div>

                                        <div className="h-3 overflow-hidden rounded-full bg-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${modeData.progress}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                                className="h-full rounded-full bg-gradient-to-r from-[#f0f0f5]/60 to-[#f0f0f5]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-[#f0f0f5]/40">Lessons completed</p>
                                                <p className="font-medium text-[#f0f0f5]">{modeData.completedLessons}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#f0f0f5]/40">Words learned</p>
                                                <p className="font-medium text-[#f0f0f5]">{modeData.wordsLearned}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="mb-2 text-xs font-medium text-emerald-400">Strengths</p>
                                                <ul className="space-y-1 text-xs text-[#f0f0f5]/60">
                                                    {modeData.strengths.map((strength, i) => (
                                                        <li key={i}>• {strength}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-xs font-medium text-rose-400">Areas to improve</p>
                                                <ul className="space-y-1 text-xs text-[#f0f0f5]/60">
                                                    {modeData.weaknesses.map((weakness, i) => (
                                                        <li key={i}>• {weakness}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}