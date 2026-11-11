// ARCHITECT: layout приложения. Ниже md рельса уступает место drawer'у поверх контента,
// поэтому main не имеет левого отступа на мобильном и получает md:ml-* только там, где рельса
// действительно занимает место. Свёрнутость хранится в localStorage: пользователь не должен
// выбирать её заново на каждой перезагрузке; по умолчанию ниже lg рельса сложена, потому что
// на планшете развёрнутая рельса съедает половину рабочей ширины.
// ARCHITECT: переход отступа — 250ms easeInOut, синхронно анимации ширины рельсы. Без
// синхронизации кромка контента уезжает относительно сайдбара.

import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarDrawer } from "@/components/layout/SidebarDrawer";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const WIDE_MEDIA_QUERY = "(min-width: 1024px)";
const COLLAPSE_STORAGE_KEY = "blobus.sidebar-collapsed";

function readInitialCollapsed(): boolean {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored !== null) return stored === "true";

    return !window.matchMedia(WIDE_MEDIA_QUERY).matches;
}

export function AppLayout() {
    const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readInitialCollapsed);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerRoute, setDrawerRoute] = useState("");
    const { pathname } = useLocation();

    // ARCHITECT: смена маршрута закрывает drawer. Состояние правится на рендере, а не в эффекте:
    // эффект дал бы кадр с открытым меню поверх нового экрана, и это ровно тот случай, для
    // которого React рекомендует сравнивать предыдущее значение на рендере.
    if (drawerRoute !== pathname) {
        setDrawerRoute(pathname);
        if (isDrawerOpen) setIsDrawerOpen(false);
    }

    // ARCHITECT: свёрнутость пишется в localStorage прямо при переключении, а не эффектом на
    // изменение состояния: запись не зависит от того, смонтирован ли layout после смены.
    const handleToggleSidebar = (): void => {
        const nextCollapsed = !isSidebarCollapsed;
        setIsSidebarCollapsed(nextCollapsed);
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(nextCollapsed));
    };

    return (
        <div className="flex min-h-dvh bg-black text-[#f0f0f5]">
            {isDesktop ? (
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
            ) : (
                <SidebarDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                {!isDesktop && <MobileTopBar onOpenMenu={() => setIsDrawerOpen(true)} />}

                <main
                    className={cn(
                        "min-w-0 flex-1 transition-[margin] duration-[250ms] ease-in-out",
                        isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[280px]"
                    )}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

