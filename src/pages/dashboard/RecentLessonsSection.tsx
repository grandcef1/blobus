// ARCHITECT: последние занятия. «Смотреть все» — ссылка на раздел «Сессии» вместо кнопки без
// обработчика: остановленная тема открывается из списка. Строки урока получили min-w-0 и
// truncate, чтобы длинная тема не создавала горизонтальный скролл на 360px.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MOCK_LESSON_HISTORY } from "@/api/mocks/progress";

const LESSON_LIMIT = 3;

export function RecentLessonsSection() {
    const { t, i18n } = useTranslation("dashboard");
    const lessons = MOCK_LESSON_HISTORY.slice(0, LESSON_LIMIT);

    return (
        <section aria-labelledby="recent-lessons-title" className="rounded-2xl bg-[#111113] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="recent-lessons-title" className="text-base font-medium text-[#f0f0f5]/80">
                    {t("overview.recent.title")}
                </h2>
                <Link
                    to="/app/sessions"
                    className="shrink-0 text-sm text-[#f0f0f5]/50 transition-colors hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                >
                    {t("overview.recent.viewAll")}
                </Link>
            </div>

            {lessons.length === 0 ? (
                <p className="text-sm text-[#f0f0f5]/40">{t("overview.recent.empty")}</p>
            ) : (
                <div className="space-y-2">
                    {lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-[#141416] px-4 py-3.5 transition-colors hover:bg-[#1a1a1c]"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#f0f0f5]">{lesson.topic}</p>
                                <p className="mt-0.5 truncate text-xs text-[#f0f0f5]/40">
                                    {t("overview.recent.duration", { minutes: lesson.duration })} ·{" "}
                                    {new Date(lesson.completedAt).toLocaleDateString(i18n.language, {
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </p>
                            </div>
                            <span className="shrink-0 text-base font-semibold tabular-nums text-[#f0f0f5]/70">
                                {lesson.score}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
