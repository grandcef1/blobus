// ARCHITECT: Обзор — стартовая страница приложения. Приветственная строка заменена названием
// раздела с нейтральной подписью: обращение по имени и «Привет» — клише из чёрного списка
// микрокопа. Искусственный лоадер (350 мс таймер) убран: мок-данные синхронные, задержка
// только откладывала отрисовку, а правило проекта требует не показывать загрузку короче 300 мс.

import { motion } from "framer-motion";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { getSessions } from "@/api/sessions";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { ListeningPromptCard } from "./ListeningPromptCard";
import { MetricsRow } from "./MetricsRow";
import { ProgressSection } from "./ProgressSection";
import { RecentLessonsSection } from "./RecentLessonsSection";

export function DashboardPage() {
    const progress = MOCK_USER_PROGRESS;
    const activeSession = getSessions()[0];

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
