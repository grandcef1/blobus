// ARCHITECT: список недавних сессий читается общим хуком useSessions: ключ тот же, что у страницы, поэтому
// кэш общий, а истёкшую сессию обрабатывает общий useAuthExpiry (один тост и один редирект на приложение).
// Пять записей — предел, за которым список начинает конкурировать с навигацией; остальное живёт в «Сессиях».
// Секция тихая: при загрузке, ошибке и пустом списке её не показываем — скелетон и разбор ошибки на странице.
// ARCHITECT: обе ветки — ссылки на /app/chat/:id: раньше реальные записи были декорацией, и открыть тему из
// рельсы было нельзя. Ветки различаются только источником заголовка и полем репетитора.

import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { useSessions } from "@/hooks/useSessions";
import { getSessionTitle } from "@/lib/sessionTitle";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING } from "./navigation";

interface SidebarRecentSessionsProps {
    isCollapsed: boolean;
}

const RECENT_SESSIONS_LIMIT = 5;

export function SidebarRecentSessions({ isCollapsed }: SidebarRecentSessionsProps) {
    const { t } = useTranslation("dashboard");
    const { pathname } = useLocation();
    const result = useSessions();

    if (isCollapsed || result.isLoading || result.isError || result.sessions.length === 0)
        return null;

    // ARCHITECT: одна разметка строки на обе ветки: различаются источник заголовка и поле репетитора,
    // остальное — идентификатор, ссылка, активное состояние, аватар и классы — общее.
    const rows =
        result.kind === "mock"
            ? result.sessions.slice(0, RECENT_SESSIONS_LIMIT).map((session) => ({
                  id: session.id,
                  title: session.title,
                  tutorId: session.repetitorId,
              }))
            : result.sessions.slice(0, RECENT_SESSIONS_LIMIT).map((summary) => ({
                  id: summary.id,
                  title: getSessionTitle(summary, t),
                  tutorId: summary.tutorId,
              }));

    return (
        <section
            className="mt-5 flex min-h-0 flex-1 flex-col"
            aria-labelledby="sidebar-recent-title"
        >
            <p
                id="sidebar-recent-title"
                className="mb-2 shrink-0 px-3 text-[11px] font-medium uppercase tracking-wider text-[#f0f0f5]/30"
            >
                {t("nav.recentSessions")}
            </p>
            <div className="thin-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
                {rows.map((row) => {
                    const isActive = pathname === `/app/chat/${row.id}`;

                    return (
                        <Link
                            key={row.id}
                            to={`/app/chat/${row.id}`}
                            className={cn(
                                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 transition-colors",
                                SIDEBAR_FOCUS_RING,
                                isActive
                                    ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                    : "text-[#f0f0f5]/40 hover:bg-[#141416] hover:text-[#f0f0f5]/70"
                            )}
                        >
                            <BlobatarAvatar id={row.tutorId} className="size-6 bg-white/5" />
                            <span className="truncate text-[13px]">{row.title}</span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
