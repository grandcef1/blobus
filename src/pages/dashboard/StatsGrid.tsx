// ARCHITECT: Сетка статистики — 4 карточки в ряд на десктопе

import { Flame, BookOpen, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "./StatCard";
import type { UserProgress } from "@/types/progress";

interface StatsGridProps {
    progress: UserProgress;
}

export function StatsGrid({ progress }: StatsGridProps) {
    const totalWords =
        progress.modeProgress.interview.wordsLearned +
        progress.modeProgress.speaking.wordsLearned +
        progress.modeProgress.grammar.wordsLearned +
        progress.modeProgress.general.wordsLearned;

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
                icon={Flame}
                label="Дней подряд"
                value={progress.streakDays}
                unit="дн"
            />
            <StatCard
                icon={BookOpen}
                label="Выучено слов"
                value={totalWords}
            />
            <StatCard
                icon={Clock}
                label="Время обучения"
                value={progress.totalStudyMinutes}
                unit="мин"
            />
            <StatCard
                icon={TrendingUp}
                label="Уровень"
                value={progress.currentLevel}
            />
        </div>
    );
}