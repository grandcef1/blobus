// ARCHITECT: мобильная шапка — точка доступа к меню и профилю там, где рельса скрыта.
// Заголовок раздела берётся из общего списка навигации, поэтому шапка и меню не расходятся.
// Кнопки не меньше 44px: это тач-цели. Высота h-14 совпадает с ChatHeader, чтобы переход
// между экранами не дёргал композицию.

import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING, findSectionTitle } from "./navigation";

interface MobileTopBarProps {
    onOpenMenu: () => void;
}

const ICON_BUTTON =
    "flex size-11 shrink-0 items-center justify-center rounded-xl text-[#f0f0f5]/70 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]";

export function MobileTopBar({ onOpenMenu }: MobileTopBarProps) {
    const { pathname } = useLocation();

    return (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-black/80 px-2 backdrop-blur-md md:hidden">
            <button type="button" onClick={onOpenMenu} aria-label="Открыть меню" className={cn(ICON_BUTTON, SIDEBAR_FOCUS_RING)}>
                <Menu className="size-5" aria-hidden="true" />
            </button>

            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-[#f0f0f5]">
                {findSectionTitle(pathname)}
            </p>

            <Link to="/app/profile" aria-label="Профиль" className={cn(ICON_BUTTON, SIDEBAR_FOCUS_RING)}>
                <BlobatarAvatar id={MOCK_PROFILE_USER.blobatarId} className="size-8 bg-white/5" />
            </Link>
        </header>
    );
}
