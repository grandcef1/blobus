import { Flame, BookOpen, Clock, Trophy } from "lucide-react";
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

    const unlockedAchievements = progress.achievements.filter((a) => a.unlockedAt).length;

    const metrics = [
        { icon: Flame, label: "Дней подряд", value: progress.streakDays },
        { icon: BookOpen, label: "Слов выучено", value: totalWords },
        { icon: Clock, label: "Минут занятий", value: progress.totalStudyMinutes },
        { icon: Trophy, label: "Достижений", value: unlockedAchievements },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric) => (
                <div
                    key={metric.label}
                    className="flex items-center gap-4 rounded-xl bg-[#141416] p-5"
                >
                    <div className="flex size-11 items-center justify-center rounded-lg bg-[#1a1a1c]">
                        <metric.icon className="size-5 text-[#f0f0f5]/60" strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-2xl font-semibold tabular-nums leading-tight text-[#f0f0f5]">
                            {metric.value}
                        </p>
                        <p className="mt-0.5 text-xs text-[#f0f0f5]/40">{metric.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}