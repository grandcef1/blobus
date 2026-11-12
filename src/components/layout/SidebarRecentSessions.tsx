// ARCHITECT: список недавних сессий читается из общего хранилища (api/sessions), а не из мока
// напрямую: сессия, созданная в мастере, сразу появляется в меню. Пять записей — предел, за
// которым список начинает конкурировать с навигацией; остальное живёт в разделе «Сессии».
// В сложенном виде секцию не показываем: узкая колонка без подписей читается только по иконкам.

import { Link, useLocation } from "react-router-dom";
import { getSessions } from "@/api/sessions";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING } from "./navigation";

interface SidebarRecentSessionsProps {
    isCollapsed: boolean;
}

const RECENT_SESSIONS_LIMIT = 5;

export function SidebarRecentSessions({ isCollapsed }: SidebarRecentSessionsProps) {
    const { pathname } = useLocation();
    const sessions = getSessions().slice(0, RECENT_SESSIONS_LIMIT);

    if (isCollapsed || sessions.length === 0) return null;

    return (
        <section className="mt-5 flex min-h-0 flex-1 flex-col" aria-labelledby="sidebar-recent-title">
            <p
                id="sidebar-recent-title"
                className="mb-2 shrink-0 px-3 text-[11px] font-medium uppercase tracking-wider text-[#f0f0f5]/30"
            >
                Недавние сессии
            </p>
            <div className="sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
                {sessions.map((session) => {
                    const isActive = pathname === `/app/chat/${session.id}`;

                    return (
                        <Link
                            key={session.id}
                            to={`/app/chat/${session.id}`}
                            className={cn(
                                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 transition-colors",
                                SIDEBAR_FOCUS_RING,
                                isActive
                                    ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                    : "text-[#f0f0f5]/40 hover:bg-[#141416] hover:text-[#f0f0f5]/70"
                            )}
                        >
                            <BlobatarAvatar id={session.repetitorId} className="size-6 bg-white/5" />
                            <span className="truncate text-[13px]">{session.title}</span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
