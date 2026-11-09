// ARCHITECT: Главный сайдбар приложения - навигация, сессии, профиль

import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_SESSIONS } from '@/api/mocks/sessions';
import { MOCK_REPETITORS } from '@/api/mocks/repetitors';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: typeof MessageSquare;
    badge?: number;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'chat', label: 'Lessons', href: '/app/chat', icon: MessageSquare },
    { id: 'profile', label: 'Profile', href: '/app/profile', icon: User },
    { id: 'settings', label: 'Settings', href: '/app/settings', icon: Settings },
    { id: 'billing', label: 'Billing', href: '/app/billing', icon: CreditCard },
    { id: 'admin', label: 'Admin', href: '/app/admin', icon: Shield },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const location = useLocation();
   // const [hoveredSession, setHoveredSession] = useState<string | null>(null);

    const getRepetitor = (repetitorId: string) => {
        return MOCK_REPETITORS.find((r) => r.id === repetitorId);
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 72 : 280 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={cn(
                'fixed left-0 top-0 z-40 flex h-screen flex-col',
                'border-r border-white/10 bg-[#0a0a0f]'
            )}
        >
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 px-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                    <GraduationCap className="size-5 text-[#f0f0f5]" />
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

            {/* New Session Button */}
            <div className="px-3 pb-2">
                <button
                    className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5',
                        'bg-white/[0.06] text-[#f0f0f5] transition-colors',
                        'hover:bg-white/[0.1]'
                    )}
                >
                    <Plus className="size-4 shrink-0" />
                    {!isCollapsed && (
                        <span className="truncate text-sm font-medium">New Lesson</span>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <div className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.id}
                                to={item.href}
                                className={cn(
                                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                                    isActive
                                        ? 'bg-white/[0.08] text-[#f0f0f5]'
                                        : 'text-[#f0f0f5]/50 hover:bg-white/[0.04] hover:text-[#f0f0f5]/80'
                                )}
                            >
                                <Icon className="size-4 shrink-0" />
                                {!isCollapsed && (
                                    <span className="truncate text-sm">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Sessions List */}
                {!isCollapsed && (
                    <div className="mt-6">
                        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                            Recent Sessions
                        </p>
                        <div className="space-y-0.5">
                            {MOCK_SESSIONS.map((session) => {
                                const repetitor = getRepetitor(session.repetitorId);
                                const isActive = location.pathname === `/app/chat/${session.id}`;

                                return (
                                    <Link
                                        key={session.id}
                                        to={`/app/chat/${session.id}`}
                                        //onMouseEnter={() => setHoveredSession(session.id)}
                                        //onMouseLeave={() => setHoveredSession(null)}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                                            isActive
                                                ? 'bg-white/[0.08] text-[#f0f0f5]'
                                                : 'text-[#f0f0f5]/40 hover:bg-white/[0.04] hover:text-[#f0f0f5]/70'
                                        )}
                                    >
                                        <div
                                            className="size-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: repetitor?.avatarColor }}
                                        />
                                        <span className="truncate text-[13px]">{session.title}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </nav>

            {/* User Section */}
            <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <div className="size-8 shrink-0 overflow-hidden rounded-full bg-white/10" />
                    {!isCollapsed && (
                        <>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#f0f0f5]">
                                    Alex Developer
                                </p>
                                <p className="truncate text-xs text-[#f0f0f5]/40">
                                    Pro Plan
                                </p>
                            </div>
                            <button className="rounded-lg p-1.5 text-[#f0f0f5]/30 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/60">
                                <LogOut className="size-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={onToggle}
                className={cn(
                    'absolute -right-3 top-20 flex size-6 items-center justify-center',
                    'rounded-full border border-white/10 bg-[#0a0a0f] text-[#f0f0f5]/40',
                    'transition-colors hover:text-[#f0f0f5]'
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