// ARCHITECT: одна строка меню на все пункты. В развёрнутом виде строка полной ширины, в
// сложенном — плитка 40×40 по центру рельсы: без горизонтальных паддингов строки иконка
// встаёт ровно по оси, из-за двойных паддингов раньше она уезжала влево. Подпись в сложенном
// виде доступна через title и aria-current, поэтому смысл пункта не теряется.

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING, type AppNavItem } from "./navigation";

interface SidebarNavLinkProps {
    item: AppNavItem;
    isCollapsed: boolean;
    isActive: boolean;
}

export function SidebarNavLink({ item, isCollapsed, isActive }: SidebarNavLinkProps) {
    const Icon = item.icon;

    return (
        <Link
            to={item.href}
            title={isCollapsed ? item.label : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "flex items-center rounded-xl transition-colors",
                SIDEBAR_FOCUS_RING,
                isCollapsed ? "mx-auto size-10 justify-center" : "min-h-11 gap-3 px-3",
                isActive
                    ? "bg-[#1a1a1c] text-[#f0f0f5]"
                    : "text-[#f0f0f5]/50 hover:bg-[#141416] hover:text-[#f0f0f5]/80"
            )}
        >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
        </Link>
    );
}
