// ARCHITECT: «Обзор» — стартовая страница приложения. Все показатели приходят одной сводкой GET /api/progress:
// выдуманных метрик (минуты практики, достижения, прогресс по режимам) в схеме нет, поэтому экран их не
// показывает — вместо них счётчики сессий, сообщений и слов плюс честная недельная активность.
// ARCHITECT: сводку читает общий хук useProgress: те же данные нужны профилю, а скелетон здесь — настоящее
// состояние загрузки, а не декорация.

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useProgress } from "@/hooks/useProgress";
import { OverviewSkeleton } from "@/components/dashboard/skeletons/OverviewSkeleton";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { ListeningPromptCard } from "./ListeningPromptCard";
import { MetricsRow } from "./MetricsRow";
import { ProgressSection } from "./ProgressSection";
import { RecentLessonsSection } from "./RecentLessonsSection";

export function DashboardPage() {
    const { t } = useTranslation("dashboard");
    const { progress, isLoading } = useProgress();

    if (isLoading || progress === null) return <OverviewSkeleton />;

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("overview.title")}</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">{t("overview.subtitle")}</p>
                </motion.header>

                <div className="space-y-4">
                    <ContinueLearningCard
                        session={progress.recentSessions[0] ?? null}
                        progress={progress}
                    />
                    <MetricsRow progress={progress} />
                    <ListeningPromptCard />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ProgressSection
                            weeklyActivity={progress.weeklyActivity}
                            level={progress.level}
                            score={progress.score}
                        />
                        <RecentLessonsSection sessions={progress.recentSessions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
