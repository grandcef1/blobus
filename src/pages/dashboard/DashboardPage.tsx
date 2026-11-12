// ARCHITECT: Обзор — стартовая страница приложения. Приветственная строка заменена названием
// раздела с нейтральной подписью: обращение по имени и «Привет» — клише из чёрного списка
// микрокопа.
// ARCHITECT: прогресс и список сессий читаются одним запросом через useMockQuery, поэтому скелетон
// здесь — настоящее состояние загрузки, а не декорация. Задержку держит мок-обёртка, и с реальным
// API меняется только fetcher.

import { motion } from "framer-motion";
import { fetchUserProgress } from "@/api/progress";
import { fetchSessions } from "@/api/sessions";
import { useMockQuery } from "@/hooks/useMockQuery";
import { OverviewSkeleton } from "@/components/dashboard/skeletons/OverviewSkeleton";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { ListeningPromptCard } from "./ListeningPromptCard";
import { MetricsRow } from "./MetricsRow";
import { ProgressSection } from "./ProgressSection";
import { RecentLessonsSection } from "./RecentLessonsSection";

async function loadOverview() {
    const [progress, sessions] = await Promise.all([fetchUserProgress(), fetchSessions()]);

    return { progress, sessions };
}

export function DashboardPage() {
    const { data, isLoading } = useMockQuery(loadOverview);

    if (isLoading || data === null) return <OverviewSkeleton />;

    const { progress, sessions } = data;
    const activeSession = sessions[0];

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">Обзор</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">Прогресс по направлениям и последние занятия</p>
                </motion.header>

                <div className="space-y-4">
                    {activeSession && <ContinueLearningCard session={activeSession} progress={progress} />}
                    <MetricsRow progress={progress} />
                    <ListeningPromptCard />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ProgressSection progress={progress} />
                        <RecentLessonsSection />
                    </div>
                </div>
            </div>
        </div>
    );
}
