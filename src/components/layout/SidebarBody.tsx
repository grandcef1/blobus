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
    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* ARCHITECT: знак проекта — статичная мини-версия бренд-блобатара (28px): блобатары
                и есть визуальный характер продукта, поэтому в шапке стоит тот же персонаж, что
                в hero, а не глобус-плейсхолдер. Плашки нет — знак лежит прямо на тёмном фоне
                сайдбара, в сложенной рельсе центрируется по justify-center. */}
            <div className={cn("flex h-16 shrink-0 items-center gap-3", isCollapsed ? "justify-center" : "px-4")}>
                <BrandBlobatar interactive={false} />
                {!isCollapsed && (
                    <span className="truncate text-lg font-semibold tracking-tight text-[#f0f0f5]">
                        Blobus
                    </span>
                )}
            </div>

            <div className={cn("shrink-0 pb-2", isCollapsed ? "flex justify-center" : "px-3")}>
                <Link
                    to="/session/new"
                    title={isCollapsed ? "Новая сессия" : undefined}
                    className={cn(
                        "flex items-center justify-center gap-2.5 rounded-xl bg-[#f0f0f5] text-black transition-colors hover:bg-[#f0f0f5]/90",
                        SIDEBAR_FOCUS_RING,
                        isCollapsed ? "size-10" : "min-h-11 w-full px-3 text-sm font-medium"
                    )}
                >
                    <Plus className="size-5 shrink-0" aria-hidden="true" />
                    {!isCollapsed && <span className="truncate">Новая сессия</span>}
                </Link>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col py-2" aria-label="Главная навигация">
                <SidebarNav isCollapsed={isCollapsed} />
                <SidebarRecentSessions isCollapsed={isCollapsed} />
            </nav>

            <SidebarProfileCard isCollapsed={isCollapsed} />
        </div>
    );
}
