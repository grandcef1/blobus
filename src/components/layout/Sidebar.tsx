import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Plus,
    User,
    Settings,
    CreditCard,
    Shield,
    ChevronLeft,
    ChevronRight,
    LogOut,
    BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_SESSIONS } from "@/api/mocks/sessions";
import { MOCK_BLOBATARS, getBlobatarById } from "@/api/mocks/blobatars";
import { Blobatar } from "@blobatar/react";

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: typeof MessageSquare;
}

const NAV_ITEMS: NavItem[] = [
    { id: "chat", label: "Уроки", href: "/app/chat", icon: MessageSquare },
    { id: "vocabulary", label: "Словарь", href: "/app/vocabulary", icon: BookOpen },
    { id: "profile", label: "Профиль", href: "/app/profile", icon: User },
    { id: "settings", label: "Настройки", href: "/app/settings", icon: Settings },
    { id: "billing", label: "Подписка", href: "/app/billing", icon: CreditCard },
    { id: "admin", label: "Админ", href: "/app/admin", icon: Shield },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const location = useLocation();

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 72 : 280 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-[#0d0d0d]"
        >
            <div className="flex h-16 items-center gap-3 px-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#f0f0f5]">
                    <span className="text-lg font-bold text-black">B</span>
                </div>
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-lg font-semibold tracking-tight text-[#f0f0f5]"
                        >
                            Blobus
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            <div className="px-3 pb-2">
                <button
                    type="button"
                    className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
                        "bg-[#f0f0f5] text-black transition-colors",
                        "hover:bg-[#f0f0f5]/90",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
                    )}
                >
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    {!isCollapsed && (
                        <span className="truncate text-sm font-medium">Новый урок</span>
                    )}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Главная навигация">
                <div className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.id}
                                to={item.href}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                                    isActive
                                        ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                        : "text-[#f0f0f5]/50 hover:bg-[#141416] hover:text-[#f0f0f5]/80"
                                )}
                            >
                                <Icon className="size-4 shrink-0" aria-hidden="true" />
                                {!isCollapsed && (
                                    <span className="truncate text-sm">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {!isCollapsed && (
                    <div className="mt-6">
                        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                            Последние уроки
                        </p>
                        <div className="space-y-0.5">
                            {MOCK_SESSIONS.map((session) => {
                                const blobatar = getBlobatarById(session.repetitorId);
                                const isActive = location.pathname === `/app/chat/${session.id}`;

                                return (
                                    <Link
                                        key={session.id}
                                        to={`/app/chat/${session.id}`}
                                        className={cn(
                                            "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
                                            isActive
                                                ? "bg-[#1a1a1c] text-[#f0f0f5]"
                                                : "text-[#f0f0f5]/40 hover:bg-[#141416] hover:text-[#f0f0f5]/70"
                                        )}
                                    >
                                        <div className="size-6 shrink-0">
                                            {blobatar ? (
                                                <Blobatar
                                                    animate="always"
                                                    name={blobatar.name.toLowerCase()}
                                                    traits={blobatar.traits}
                                                />
                                            ) : (
                                                <div className="size-6 rounded-full bg-white/10" />
                                            )}
                                        </div>
                                        <span className="truncate text-[13px]">{session.title}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </nav>

            <div className="border-t border-white/5 p-3">
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <div className="size-8 shrink-0 overflow-hidden rounded-full bg-white/5">
                        <Blobatar
                            animate="always"
                            name="miya"
                            traits={MOCK_BLOBATARS[0].traits}
                        />
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#f0f0f5]">
                                    Алекс Разработчик
                                </p>
                                <p className="truncate text-xs text-[#f0f0f5]/40">Тариф Free</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Выйти из аккаунта"
                                className="rounded-lg p-1.5 text-[#f0f0f5]/30 transition-colors hover:bg-[#1a1a1c] hover:text-[#f0f0f5]/60"
                            >
                                <LogOut className="size-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={onToggle}
                aria-label={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
                className={cn(
                    "absolute -right-3 top-20 flex size-6 items-center justify-center",
                    "rounded-full border border-white/10 bg-[#0d0d0d] text-[#f0f0f5]/40",
                    "transition-colors hover:text-[#f0f0f5]"
                )}
            >
                {isCollapsed ? (
                    <ChevronRight className="size-3.5" />
                ) : (
                    <ChevronLeft className="size-3.5" />
                )}
            </button>
        </motion.aside>
    );
}