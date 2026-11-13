// ARCHITECT: навигация приложения — общий источник для рельсы сайдбара, мобильного drawer
// и заголовка топбара. Раньше пункты меню и заголовок раздела задавались порознь, из-за
// чего шапка и меню могли разойтись. Здесь же лежит правило активности: чат относится к
// разделу «Сессии».

import { BookOpen, CreditCard, LayoutDashboard, LifeBuoy, MessagesSquare, Settings, Shield, Users } from "lucide-react";

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

// ARCHITECT: стартовая страница приложения. Вошедший пользователь попадает сюда: «Обзор» показывает
// прогресс и продолжение занятия как выбор, а последняя сессия открывается уже осознанным шагом —
// вход не должен сразу бросать в чат.
export const APP_HOME_PATH = "/app/overview";

export const PRIMARY_NAV_ITEMS: AppNavItem[] = [
    { id: "overview", label: "Обзор", href: APP_HOME_PATH, icon: LayoutDashboard },
    {
        id: "sessions",
        label: "Сессии",
        href: "/app/sessions",
        icon: MessagesSquare,
        activePrefixes: ["/app/sessions", "/app/chat"],
    },
    { id: "vocabulary", label: "Словарь", href: "/app/vocabulary", icon: BookOpen },
    // ARCHITECT: «Репетиторы» стоят рядом со словарём: это учебная группа, а не сервис. Страница
    // нужна к моменту смены репетитора в сессии, поэтому ссылка есть и в меню чата.
    { id: "tutors", label: "Репетиторы", href: "/app/tutors", icon: Users },
    // ARCHITECT: центр помощи закрывает учебную группу: это часть работы с продуктом, а не
    // служебный раздел вроде настроек.
    { id: "help", label: "Центр помощи", href: "/app/help", icon: LifeBuoy },
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

// ARCHITECT: разделы, которых нет в рельсе (профиль открывается из блока пользователя), но у
// которых должен быть свой заголовок вкладки: карта заголовков и карта меню — один источник.
// ARCHITECT: экран проверки аудирования (/listening) сюда не входит: он вне AppLayout и называет
// вкладку сам.
const EXTRA_SECTION_TITLES: { prefix: string; label: string }[] = [
    { prefix: "/app/profile", label: "Профиль" },
];

export function findSectionTitle(pathname: string): string {
    const match = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].find((item) =>
        isNavItemActive(item, pathname)
    );

    if (match) return match.label;

    const extra = EXTRA_SECTION_TITLES.find((item) => pathname.startsWith(item.prefix));

    return extra ? extra.label : "Blobus";
}
