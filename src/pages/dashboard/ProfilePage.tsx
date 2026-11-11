// ARCHITECT: Профиль. Шапка складывается в колонку на телефоне, аватар и имя растут с
// брейкпоинтом: на 360px имя не помещается в одну строку рядом с аватаром, а email усечён,
// чтобы длинный адрес не растягивал карточку. Цветные акценты убраны: тариф показан текстом
// с тонким маркером, значения — tabular-nums.

import { motion } from "framer-motion";
import { Award, BookOpen, Calendar, Mail, TrendingUp } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { StatusMarker } from "@/components/shared/StatusMarker";
import { ProfileModeCard } from "./ProfileModeCard";
import type { LearningMode } from "@/types/onboarding";

export function ProfilePage() {
    const progress = MOCK_USER_PROGRESS;
    const userBlobatar = getBlobatarById(MOCK_PROFILE_USER.blobatarId);

    const totalWords = Object.values(progress.modeProgress).reduce(
        (sum, mode) => sum + mode.wordsLearned,
        0
    );

    const stats = [
        { id: "level", icon: TrendingUp, label: "Текущий уровень", value: progress.currentLevel },
        {
            id: "achievements",
            icon: Award,
            label: "Достижения",
            value: String(progress.achievements.filter((item) => item.unlockedAt).length),
        },
        { id: "words", icon: BookOpen, label: "Всего слов", value: String(totalWords) },
    ];

    const modeProgress = Object.entries(progress.modeProgress) as [
        LearningMode,
        (typeof progress.modeProgress)[LearningMode],
    ][];

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
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
                    <section className="flex flex-col gap-4 rounded-2xl bg-[#111113] p-4 sm:flex-row sm:items-center md:p-5">
                        <span className="size-16 shrink-0 overflow-hidden rounded-full bg-[#1a1a1c] md:size-24">
                            {userBlobatar ? (
                                <Blobatar
                                    animate="always"
                                    name={userBlobatar.name.toLowerCase()}
                                    traits={userBlobatar.traits}
                                />
                            ) : (
                                <span className="block size-full rounded-full bg-white/10" />
                            )}
                        </span>

                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-semibold text-[#f0f0f5] md:text-3xl">
                                {MOCK_PROFILE_USER.name}
                            </h2>

                            <div className="mt-2 flex flex-col gap-1 text-sm text-[#f0f0f5]/40 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{MOCK_PROFILE_USER.email}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                                    {MOCK_PROFILE_USER.memberSince}
                                </span>
                            </div>

                            <StatusMarker label={MOCK_PROFILE_USER.planLabel} className="mt-2" />
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {stats.map((stat) => (
                            <div key={stat.id} className="flex items-center gap-3 rounded-xl bg-[#141416] p-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1c]">
                                    <stat.icon className="size-4 text-[#f0f0f5]/60" strokeWidth={1.5} aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-xs text-[#f0f0f5]/40">{stat.label}</span>
                                    <span className="block text-xl font-semibold tabular-nums text-[#f0f0f5]">
                                        {stat.value}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <section
                        aria-labelledby="profile-modes-title"
                        className="rounded-2xl bg-[#111113] p-4 md:p-5"
                    >
                        <h2 id="profile-modes-title" className="mb-4 text-base font-medium text-[#f0f0f5]/80">
                            Прогресс по направлениям
                        </h2>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {modeProgress.map(([modeId, modeData]) => (
                                <ProfileModeCard key={modeId} modeId={modeId} modeData={modeData} />
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
