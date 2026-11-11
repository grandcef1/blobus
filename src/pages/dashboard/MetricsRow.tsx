// ARCHITECT: четыре метрики: две колонки на телефоне и четыре с lg. Иконки без цветных плиток —
// состояние передаёт число, а не заливка; значения tabular-nums, чтобы цифры не «плясали».

import { BookOpen, Clock, Flame, Trophy } from "lucide-react";
import type { UserProgress } from "@/types/progress";

interface MetricsRowProps {
    progress: UserProgress;
}

export function MetricsRow({ progress }: MetricsRowProps) {
    const totalWords =
        progress.modeProgress.interview.wordsLearned +
        progress.modeProgress.speaking.wordsLearned +
        progress.modeProgress.grammar.wordsLearned +
        progress.modeProgress.general.wordsLearned;

    const unlockedAchievements = progress.achievements.filter((item) => item.unlockedAt).length;

    const metrics = [
        { id: "streak", icon: Flame, label: "Дней подряд", value: progress.streakDays },
        { id: "words", icon: BookOpen, label: "Слов выучено", value: totalWords },
        { id: "minutes", icon: Clock, label: "Минут занятий", value: progress.totalStudyMinutes },
        { id: "achievements", icon: Trophy, label: "Достижений", value: unlockedAchievements },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metrics.map((metric) => (
                <div key={metric.id} className="rounded-xl bg-[#141416] p-4 md:p-5">
                    <div className="flex items-center gap-2 text-[#f0f0f5]/40">
                        <metric.icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        <p className="truncate text-xs">{metric.label}</p>
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-[#f0f0f5]">{metric.value}</p>
                </div>
            ))}
        </div>
    );
}
