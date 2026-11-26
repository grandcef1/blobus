// ARCHITECT: недельная активность вместо «прогресса по направлениям»: по режимам схема ничего не измеряет, а
// сообщения по дням лежат в счётчиках. Высота столбца задаётся данными, поэтому она уходит инлайновым стилем:
// класс Tailwind для произвольного процента читался бы хуже, чем число.
// ARCHITECT: под столбцами стоит уровень из теста: это единственная честная оценка «где я сейчас», и она
// приходит тем же DTO, что и активность.

import { useTranslation } from "react-i18next";
import type { ProgressDayDto } from "@/api/progress";
import type { EnglishLevel } from "@/types/onboarding";

interface ProgressSectionProps {
    readonly weeklyActivity: readonly ProgressDayDto[];
    readonly level: EnglishLevel | null;
    readonly score: number | null;
}

// ARCHITECT: процент считается от максимума недели: при пустой неделе максимум равен единице, поэтому деления на
// ноль нет. Пустой день получает тонкую линию вместо столбца — видно, что день не пропущен, а пуст.
function barHeight(messages: number, max: number): string {
    if (messages === 0) return "4%";

    return `${Math.max(12, Math.round((messages / max) * 100))}%`;
}

export function ProgressSection({ weeklyActivity, level, score }: ProgressSectionProps) {
    const { t, i18n } = useTranslation("dashboard");
    const max = Math.max(1, ...weeklyActivity.map((day) => day.messages));

    return (
        <section
            aria-labelledby="progress-section-title"
            className="rounded-2xl bg-[#111113] p-4 md:p-5"
        >
            <h2
                id="progress-section-title"
                className="mb-4 text-base font-medium text-[#f0f0f5]/80"
            >
                {t("overview.activity.title")}
            </h2>

            <ul className="flex h-32 items-end gap-2">
                {weeklyActivity.map((day) => {
                    // ARCHITECT: подпись дня — короткая форма текущей локали: своя карта названий была бы
                    // третьим источником правды рядом с i18n локали даты.
                    const label = new Date(`${day.date}T00:00:00.000Z`).toLocaleDateString(
                        i18n.language,
                        { weekday: "short" }
                    );

                    return (
                        <li
                            key={day.date}
                            aria-label={t("overview.activity.day", {
                                day: label,
                                count: day.messages,
                            })}
                            className="flex h-full flex-1 flex-col justify-end gap-2"
                        >
                            <span
                                className="w-full rounded-sm bg-[#f0f0f5]/25"
                                style={{ height: barHeight(day.messages, max) }}
                                aria-hidden="true"
                            />
                            <span className="truncate text-center text-[10px] text-[#f0f0f5]/35">
                                {label}
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-4 border-t border-white/5 pt-3">
                <p className="text-xs text-[#f0f0f5]/40">{t("overview.activity.level")}</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-[#f0f0f5]">
                    {level ?? t("overview.activity.levelUnknown")}
                    {score !== null && (
                        <span className="ml-2 text-xs font-normal text-[#f0f0f5]/40">
                            {t("overview.activity.score", { score })}
                        </span>
                    )}
                </p>
            </div>
        </section>
    );
}
