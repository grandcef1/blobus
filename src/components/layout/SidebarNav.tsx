// ARCHITECT: навигация сайдбара: рабочие разделы, разделитель, служебные разделы. Пункт
// «Уроки» убран, потому что он вёл на /app/chat без id и открывал дашборд; вместо него
// «Обзор» и «Сессии». Профиль живёт внизу отдельной карточкой, поэтому в списке его нет.

import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, isNavItemActive } from "./navigation";
import { SidebarNavLink } from "./SidebarNavLink";

interface SidebarNavProps {
    isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: SidebarNavProps) {
    const { pathname } = useLocation();

    return (
        <div className={cn("shrink-0 space-y-1", isCollapsed ? "px-2" : "px-3")}>
            {PRIMARY_NAV_ITEMS.map((item) => (
                <SidebarNavLink
                    key={item.id}
                    item={item}
                    isCollapsed={isCollapsed}
                    isActive={isNavItemActive(item, pathname)}
                />
            ))}

            <hr className="my-3 border-t border-white/5" />

            {SECONDARY_NAV_ITEMS.map((item) => (
                <SidebarNavLink
                    key={item.id}
                    item={item}
                    isCollapsed={isCollapsed}
                    isActive={isNavItemActive(item, pathname)}
                />
            ))}
        </div>
    );
}
