// ARCHITECT: тело сайдбара — общее для десктопной рельсы и мобильного drawer, поэтому в
// drawer оно всегда развёрнуто и ни один пункт не теряет подпись. Отступы строки живут в
// SidebarNavLink: в сложенном виде строки без горизонтальных паддингов и центрируются.
// ARCHITECT: тело — flex-колонка на всю высоту: шапка, кнопка, список разделов и карточка
// профиля зафиксированы (shrink-0), растягивается только секция последних сессий. Длинный
// список сессий листается внутри себя и не уносит навигацию вверх.
// ARCHITECT: «Новый урок» переименован в «Новая сессия» и ведёт в мастер /session/new:
// раньше кнопка была мёртвой и запускала тот же экран, что пункт «Уроки».

import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
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
            {/* ARCHITECT: высота h-14 унифицирует блок с хедером чата; кроп квадратом оставляет в кадре
                только линию глаз (svg библиотеки имеет viewBox 0 0 100 100 и preserveAspectRatio по
                умолчанию, поэтому не-квадратный бокс дал бы пустые поля по бокам вместо растяжения);
                виньетка вместо блюра даёт премиальную глубину без стеклянной плашки. */}
            <div className="relative h-14 w-full shrink-0 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <div className="aspect-square w-[150%] shrink-0">
                        <BrandBlobatar gaze={false} className="h-full w-full" />
                    </div>
                </div>

                <span
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.25)_45%,rgba(0,0,0,0)_75%)]"
                    aria-hidden="true"
                />

                <Link
                    to="/"
                    aria-label={t("nav.goHome")}
                    className="group absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                    {!isCollapsed && (
                        <span className="relative block h-5 overflow-hidden">
                            <span className="block text-sm font-semibold tracking-[0.08em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out group-hover:-translate-y-full group-hover:opacity-0 motion-reduce:transition-none">
                                {t("nav.brand")}
                            </span>
                            <span className="absolute inset-0 block translate-y-full text-sm font-semibold tracking-[0.08em] text-white/90 opacity-0 drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
                                {t("nav.goHome")}
                            </span>
                        </span>
                    )}
                </Link>
            </div>

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
