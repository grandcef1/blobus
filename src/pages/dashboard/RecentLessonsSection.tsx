// ARCHITECT: последние сессии вместо выдуманных уроков: у сессии есть репетитор, режим и время, а темы и баллы
// уроков схема не хранит. Строка ведёт в свой диалог — это тот же переход, что у карточки «продолжить».

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SessionSummaryDto } from "@/api/sessions";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { getSessionTitle } from "@/lib/sessionTitle";

interface RecentLessonsSectionProps {
    readonly sessions: readonly SessionSummaryDto[];
}

export function RecentLessonsSection({ sessions }: RecentLessonsSectionProps) {
    const { t, i18n } = useTranslation("dashboard");

    return (
        <section
            aria-labelledby="recent-lessons-title"
            className="rounded-2xl bg-[#111113] p-4 md:p-5"
        >
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

            {sessions.length === 0 ? (
                <p className="text-sm text-[#f0f0f5]/40">{t("overview.recent.empty")}</p>
            ) : (
                <ul className="space-y-2">
                    {sessions.map((session) => (
                        <li key={session.id}>
                            <Link
                                to={`/app/chat/${session.id}`}
                                className="flex items-center gap-3 rounded-xl bg-[#141416] px-4 py-3.5 transition-colors hover:bg-[#1a1a1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                            >
                                <BlobatarAvatar
                                    id={session.tutorId}
                                    className="size-8"
                                    animated={false}
                                />

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-[#f0f0f5]">
                                        {getSessionTitle(session, t)}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-[#f0f0f5]/40">
                                        {new Date(session.updatedAt).toLocaleDateString(
                                            i18n.language,
                                            { day: "numeric", month: "short" }
                                        )}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
