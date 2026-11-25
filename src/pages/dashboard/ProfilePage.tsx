// ARCHITECT: Профиль. Шапка складывается в колонку на телефоне, аватар и имя растут с
// брейкпоинтом: на 360px имя не помещается в одну строку рядом с аватаром, а email усечён,
// чтобы длинный адрес не растягивал карточку. Цветные акценты убраны: тариф показан текстом
// с тонким маркером, значения — tabular-nums.

import { motion } from "framer-motion";
import { Award, BookOpen, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchProfileUser } from "@/api/profile";
import { fetchUserProgress } from "@/api/progress";
import { fetchPlacementResult } from "@/api/placement";
import { useMockQuery } from "@/hooks/useMockQuery";
import { useProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/auth";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusMarker } from "@/components/shared/StatusMarker";
import { ProfileSkeleton } from "@/components/dashboard/skeletons/ProfileSkeleton";
import { ProfileModeCard } from "./ProfileModeCard";
import { ProfileSkillsCard } from "./ProfileSkillsCard";
import { ProfileEmailRow } from "./ProfileEmailRow";
import { ProfileAvatar } from "./ProfileAvatar";
import type { LearningMode } from "@/types/onboarding";

async function loadProfile() {
    const [progress, user, result] = await Promise.all([
        fetchUserProgress(),
        fetchProfileUser(),
        fetchPlacementResult(),
    ]);

    return { progress, user, result };
}

export function ProfilePage() {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const { data, isLoading } = useMockQuery(loadProfile);
    const {
        profile,
        memberSinceLabel,
        isLoading: isProfileLoading,
        isError,
        refetch,
    } = useProfile();
    // ARCHITECT: статус подтверждения почты живёт в auth-store, поэтому хук вызывается до раннего
    // возврата скелетона: иначе порядок хуков менялся бы между рендерами.
    const authUser = useAuthStore((state) => state.user);

    if (isLoading || data === null || isProfileLoading) return <ProfileSkeleton />;

    // ARCHITECT: отказ загрузки показывает общий ErrorState с повтором, как на экране подписки.
    if (isError || !profile) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
                <div className="mx-auto max-w-6xl">
                    <ErrorState
                        title={tCommon("states.error.title")}
                        description={tCommon("states.error.description")}
                        retryLabel={tCommon("states.error.reload")}
                        onRetry={() => void refetch()}
                    />
                </div>
            </div>
        );
    }

    const { progress, user, result } = data;

    const totalWords = Object.values(progress.modeProgress).reduce(
        (sum, mode) => sum + mode.wordsLearned,
        0
    );

    // ARCHITECT: уровень переехал в блок навыков: там видно не одну строку, а разбивку по
    // дорожкам теста. Здесь остаются счётчики, которые к уровню не относятся.
    const stats = [
        {
            id: "achievements",
            icon: Award,
            label: t("profile.stats.achievements"),
            value: String(progress.achievements.filter((item) => item.unlockedAt).length),
        },
        { id: "words", icon: BookOpen, label: t("profile.stats.words"), value: String(totalWords) },
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
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("profile.title")}</h1>
                </motion.header>

                <div className="space-y-4">
                    <section className="flex flex-col gap-4 rounded-2xl bg-[#111113] p-4 sm:flex-row sm:items-center md:p-5">
                        <ProfileAvatar
                            avatarUrl={profile.avatarUrl}
                            providerAvatarUrl={profile.providerAvatarUrl}
                            displayName={profile.displayName}
                        />

                        <div className="min-w-0 flex-1">
                            <h2 className="text-2xl font-semibold text-[#f0f0f5] md:text-3xl">
                                {profile.displayName || tCommon("profile.fallbackName")}
                            </h2>

                            {/* ARCHITECT: почта переехала в отдельную строку со статусом подтверждения,
                                поэтому дублировать адрес в шапке больше не нужно. */}
                            <div className="mt-2 flex items-center gap-1.5 text-sm text-[#f0f0f5]/40">
                                <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                                {memberSinceLabel}
                            </div>

                            <StatusMarker label={user.planLabel} className="mt-2" />
                        </div>
                    </section>

                    <section className="rounded-2xl bg-[#111113] p-4 md:p-5">
                        <ProfileEmailRow
                            email={authUser?.email ?? ""}
                            isVerified={Boolean(authUser?.emailVerified)}
                        />
                    </section>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {stats.map((stat) => (
                            <div
                                key={stat.id}
                                className="flex items-center gap-3 rounded-xl bg-[#141416] p-4"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1c]">
                                    <stat.icon
                                        className="size-4 text-[#f0f0f5]/60"
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-xs text-[#f0f0f5]/40">
                                        {stat.label}
                                    </span>
                                    <span className="block text-xl font-semibold tabular-nums text-[#f0f0f5]">
                                        {stat.value}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <ProfileSkillsCard result={result} />

                    <section
                        aria-labelledby="profile-modes-title"
                        className="rounded-2xl bg-[#111113] p-4 md:p-5"
                    >
                        <h2
                            id="profile-modes-title"
                            className="mb-4 text-base font-medium text-[#f0f0f5]/80"
                        >
                            {t("profile.modes.title")}
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
