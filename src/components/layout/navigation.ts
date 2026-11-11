// ARCHITECT: навигация приложения — общий источник для рельсы сайдбара, мобильного drawer
// и заголовка топбара. Раньше пункты меню и заголовок раздела задавались порознь, из-за
// чего шапка и меню могли разойтись. Здесь же лежит правило активности: чат относится к
// разделу «Сессии».

import { BookOpen, CreditCard, LayoutDashboard, MessagesSquare, Settings, Shield } from "lucide-react";

// ARCHITECT: фокус-кольцо для строк меню. Один токен на сайдбар, drawer и топбар, иначе
// одинаковые строки получают разные состояния фокуса.
export const SIDEBAR_FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]";

export interface AppNavItem {
    id: string;
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    /** Префиксы путей, на которых пункт активен, если они шире href. */
    activePrefixes?: string[];
}

export const PRIMARY_NAV_ITEMS: AppNavItem[] = [
    { id: "overview", label: "Обзор", href: "/app/overview", icon: LayoutDashboard },
    {
        id: "sessions",
        label: "Сессии",
        href: "/app/sessions",
        icon: MessagesSquare,
        activePrefixes: ["/app/sessions", "/app/chat"],
    },
    { id: "vocabulary", label: "Словарь", href: "/app/vocabulary", icon: BookOpen },
];

export const SECONDARY_NAV_ITEMS: AppNavItem[] = [
    { id: "settings", label: "Настройки", href: "/app/settings", icon: Settings },
    { id: "billing", label: "Подписка", href: "/app/billing", icon: CreditCard },
    { id: "admin", label: "Админ", href: "/app/admin", icon: Shield },
];

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
    const prefixes = item.activePrefixes ?? [item.href];
    return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export function findSectionTitle(pathname: string): string {
    const match = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].find((item) =>
        isNavItemActive(item, pathname)
    );

    return match ? match.label : "Blobus";
}
