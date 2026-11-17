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
import { ChatBlobatar } from "@/components/landing/ChatBlobatar";
import { SIDEBAR_FOCUS_RING } from "./navigation";
import { SidebarNav } from "./SidebarNav";
import { SidebarRecentSessions } from "./SidebarRecentSessions";
import { SidebarProfileCard } from "./SidebarProfileCard";

interface SidebarBodyProps {
    isCollapsed: boolean;
}

// ARCHITECT: маска угасания — верх блока растворяется в фоне сайдбара; вынесена константой, чтобы
// длинная строка инлайна не рвала разметку по printWidth.
const EYES_FADE_MASK = "linear-gradient(to bottom, transparent 0%, black 40%, black 100%)";

export function SidebarBody({ isCollapsed }: SidebarBodyProps) {
    const { t } = useTranslation("dashboard");

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* ARCHITECT: компактный блок глаз: рендерим ChatBlobatar — «двойника» брендового блобатара с
                animate="always" и БЕЗ useGaze, потому что BrandBlobatar умеет только два режима: слежение
                за курсором (слушатель pointermove на window) либо статичную марку без анимации.
                Маска сверху даёт угасание, overflow-hidden обрезает края, оставляя в кадре глаза. */}
            <div
                className="relative h-20 w-full shrink-0 overflow-hidden"
                style={{ maskImage: EYES_FADE_MASK, WebkitMaskImage: EYES_FADE_MASK }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="aspect-square w-[130%] shrink-0">
                        <ChatBlobatar />
                    </div>
                </div>

                <Link
                    to="/"
                    aria-label={t("nav.goHome")}
                    className="group absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                    {!isCollapsed && (
                        <span className="rounded px-3 py-1 text-lg font-semibold tracking-tight text-white/90 backdrop-blur-sm transition-all duration-200">
                            <span className="group-hover:hidden">{t("nav.brand")}</span>
                            <span className="hidden group-hover:inline">{t("nav.goHome")}</span>
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
