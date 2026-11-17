// ARCHITECT: тело сайдбара — общее для десктопной рельсы и мобильного drawer, поэтому в
// drawer оно всегда развёрнуто и ни один пункт не теряет подпись. Отступы строки живут в
// SidebarNavLink: в сложенном виде строки без горизонтальных паддингов и центрируются.
// ARCHITECT: тело — flex-колонка на всю высоту: шапка, кнопка, список разделов и карточка
// профиля зафиксированы (shrink-0), растягивается только секция последних сессий. Длинный
// список сессий листается внутри себя и не уносит навигацию вверх.
// ARCHITECT: «Новый урок» переименован в «Новая сессия» и ведёт в мастер /session/new:
// раньше кнопка была мёртвой и запускала тот же экран, что пункт «Уроки».

import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { BrandBlobatar } from "@/components/landing/BrandBlobatar";
import { SIDEBAR_FOCUS_RING } from "./navigation";
import { SidebarNav } from "./SidebarNav";
import { SidebarRecentSessions } from "./SidebarRecentSessions";
import { SidebarProfileCard } from "./SidebarProfileCard";

interface SidebarBodyProps {
    isCollapsed: boolean;
}

export function SidebarBody({ isCollapsed }: SidebarBodyProps) {
    const { t } = useTranslation("dashboard");

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* ARCHITECT: классическая шапка иконка+надпись возвращена по решению владельца;
                иконка крупнее, вся шапка — ссылка на лендинг с hover-сменой надписи на «На главную». */}
            <Link
                to="/"
                aria-label={t("nav.goHome")}
                className={cn(
                    "group flex h-16 shrink-0 items-center gap-3",
                    isCollapsed ? "justify-center" : "px-4",
                    SIDEBAR_FOCUS_RING
                )}
            >
                <BrandBlobatar interactive={false} className="size-9" />
                {!isCollapsed && (
                    /* ARCHITECT: grid-ячейка и leading-none держат обе надписи в одной строке без
                       переноса. Вордмарк анимируется дрейфом светимости (fx-brand), ссылка на главную
                       сделана тоньше вордмарка и со стрелкой — контраст начертаний читается премиально. */
                    <span className="relative grid h-6 shrink-0 items-center overflow-hidden px-1">
                        <span className="fx-brand col-start-1 row-start-1 whitespace-nowrap text-lg font-semibold leading-none transition-all duration-300 ease-out group-hover:-translate-y-full group-hover:opacity-0 motion-reduce:transition-none">
                            {t("nav.brand")}
                        </span>
                        <span className="col-start-1 row-start-1 flex translate-y-full items-center gap-2 whitespace-nowrap text-[15px] font-normal leading-none tracking-[0.02em] text-[#f0f0f5]/75 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
                            <ArrowLeft
                                className="size-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            {t("nav.goHome")}
                        </span>
                    </span>
                )}
            </Link>

            <div className={cn("shrink-0 pb-2", isCollapsed ? "flex justify-center" : "px-3")}>
                <Link
                    to="/session/new"
                    title={isCollapsed ? t("nav.newSession") : undefined}
                    className={cn(
                        "flex items-center justify-center gap-2.5 rounded-xl bg-[#f0f0f5] text-black transition-colors hover:bg-[#f0f0f5]/90",
                        SIDEBAR_FOCUS_RING,
                        isCollapsed ? "size-10" : "min-h-11 w-full px-3 text-sm font-medium"
                    )}
                >
                    <Plus className="size-5 shrink-0" aria-hidden="true" />
                    {!isCollapsed && <span className="truncate">{t("nav.newSession")}</span>}
                </Link>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col py-2" aria-label={t("nav.mainNav")}>
                <SidebarNav isCollapsed={isCollapsed} />
                <SidebarRecentSessions isCollapsed={isCollapsed} />
            </nav>

            <SidebarProfileCard isCollapsed={isCollapsed} />
        </div>
    );
}
