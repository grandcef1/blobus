// ARCHITECT: Профиль в стиле дашборда — монохромная палитра,
// режимы обучения в отдельных карточках, аватар через getBlobatarById

import { motion } from "framer-motion";
import { Mail, Calendar, Award, BookOpen, TrendingUp } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { ProfileModeCard } from "./ProfileModeCard";
import type { LearningMode } from "@/types/onboarding";

export function ProfilePage() {
    const progress = MOCK_USER_PROGRESS;
    const userBlobatar = getBlobatarById("alex");

    const totalWords = Object.values(progress.modeProgress).reduce(
        (sum, mode) => sum + mode.wordsLearned,
        0
    );

    const stats = [
        { icon: TrendingUp, label: "Текущий уровень", value: progress.currentLevel },
        {
            icon: Award,
            label: "Достижения",
            value: String(progress.achievements.filter((a) => a.unlockedAt).length),
        },
        { icon: BookOpen, label: "Всего слов", value: String(totalWords) },
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
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Профиль</h1>
                </motion.header>

                <div className="space-y-4">
                    <div className="flex items-center gap-5 rounded-2xl bg-[#111113] p-5">
                        <div className="size-16 shrink-0 rounded-full bg-[#1a1a1c] p-1">
                            {userBlobatar ? (
                                <Blobatar
                                    animate="always"
                                    name={userBlobatar.name.toLowerCase()}
                                    traits={userBlobatar.traits}
                                />
                            ) : (
                                <div className="size-full rounded-full bg-white/10" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold text-[#f0f0f5]">Алекс Разработчик</h2>
                            <div className="mt-1 flex items-center gap-4 text-sm text-[#f0f0f5]/40">
                                <span className="flex items-center gap-1.5">
                                    <Mail className="size-3.5" aria-hidden="true" />
                                    alex@blobus.ai
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="size-3.5" aria-hidden="true" />
                                    Ноябрь 2026
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {stats.map((stat) => (
                            <div
                                key={stat.label}
                                className="rounded-xl bg-[#141416] p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#1a1a1c]">
                                        <stat.icon
                                            className="size-4 text-[#f0f0f5]/60"
                                            strokeWidth={1.5}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#f0f0f5]/40">{stat.label}</p>
                                        <p className="text-xl font-semibold tabular-nums text-[#f0f0f5]">
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <h2 className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            Прогресс по направлениям
                        </h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {(
                                Object.entries(progress.modeProgress) as [
                                    LearningMode,
                                    (typeof progress.modeProgress)[LearningMode],
                                ][]
                            ).map(([modeId, modeData]) => (
                                <ProfileModeCard
                                    key={modeId}
                                    modeId={modeId}
                                    modeData={modeData}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}