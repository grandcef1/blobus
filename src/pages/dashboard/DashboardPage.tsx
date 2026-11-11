import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import { MOCK_SESSIONS } from "@/api/mocks/sessions";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { MetricsRow } from "./MetricsRow";
import { ProgressSection } from "./ProgressSection";
import { RecentLessonsSection } from "./RecentLessonsSection";
import { DashboardSkeleton } from "./DashboardSkeleton";

interface DashboardPageProps {
    userName?: string;
}

export function DashboardPage({ userName = "Алекс" }: DashboardPageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 350);
        return () => clearTimeout(timer);
    }, []);

    if (error) {
        return (
            <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-[#f0f0f5]/60">Не удалось загрузить данные</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-2 text-sm text-[#f0f0f5] underline hover:no-underline"
                    >
                        Повторить
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const progress = MOCK_USER_PROGRESS;
    const activeSession = MOCK_SESSIONS[0];

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">
                        Привет, {userName}
                    </h1>
                </motion.header>

                <div className="space-y-4">
                    <ContinueLearningCard session={activeSession} progress={progress} />
                    <MetricsRow progress={progress} />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ProgressSection progress={progress} />
                        <RecentLessonsSection />
                    </div>
                </div>
            </div>
        </div>
    );
}