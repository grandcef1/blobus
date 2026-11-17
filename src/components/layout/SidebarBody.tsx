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
            {/* ARCHITECT: компактный блок глаз с растянутым кропом блобатара: позиционирование через
                absolute + transform для точного контроля центра, зум w-[200%] убирает пустоту по бокам
                (силуэт шире блока и обрезается краями). Квадрат сохраняем: у svg библиотеки viewBox
                0 0 100 100 и preserveAspectRatio по умолчанию, поэтому неквадратный бокс дал бы пустые
                поля по бокам вместо растяжения. Полоса кадра ≈ 11% высоты бокса — в кадре линия глаз. */}
            <div className="relative h-16 w-full shrink-0 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute left-[50%] top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2">
                        <BrandBlobatar gaze={false} className="h-full w-full" />
                    </div>
                </div>

                <Link
                    to="/"
                    aria-label={t("nav.goHome")}
                    className="group absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                    {!isCollapsed && (
                        <span className="relative block h-8 w-full overflow-hidden px-5">
                            <span className="block w-full text-center text-xl font-bold tracking-[0.2em] text-gray-400 uppercase transition-all duration-300 ease-out group-hover:-translate-y-full group-hover:opacity-0 motion-reduce:transition-none">
                                {t("nav.brand")}
                            </span>
                            <span className="absolute inset-0 block w-full translate-y-full text-center text-xl font-bold tracking-[0.2em] text-gray-500 uppercase opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:transition-none">
                                {t("nav.goHome")}
                            </span>
                        </span>
                    )}
                </Link>
            </div>

            <div className={cn("shrink-0 mt-3 pb-2", isCollapsed ? "flex justify-center" : "px-3")}>
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
