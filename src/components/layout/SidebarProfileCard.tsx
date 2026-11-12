// ARCHITECT: карточка профиля внизу сайдбара — ссылка на /app/profile с аватаром, именем и
// тарифом. Выход — отдельная кнопка-сестра, а не вложенная в ссылку: интерактивный элемент
// внутри ссылки ломает семантику и порядок обхода клавиатурой. stopPropagation оставлен на
// случай будущей обёртки-ссылки и на клик по кнопке ничего не меняет.
// ARCHITECT: в сложенном виде остаётся центрированный аватар со ссылкой и title «Профиль».

import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING } from "./navigation";

interface SidebarProfileCardProps {
    isCollapsed: boolean;
}

export function SidebarProfileCard({ isCollapsed }: SidebarProfileCardProps) {
    const avatar = (
        <BlobatarAvatar id={MOCK_PROFILE_USER.blobatarId} className="size-8 bg-white/5" />
    );

    if (isCollapsed) {
        return (
            <div className="flex shrink-0 justify-center border-t border-white/5 py-3">
                <Link
                    to="/app/profile"
                    title="Профиль"
                    aria-label="Профиль"
                    className={cn("flex size-10 items-center justify-center rounded-full transition-colors hover:bg-[#141416]", SIDEBAR_FOCUS_RING)}
                >
                    {avatar}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex shrink-0 items-center gap-1 border-t border-white/5 p-3">
            <Link
                to="/app/profile"
                className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-[#141416]",
                    SIDEBAR_FOCUS_RING
                )}
            >
                {avatar}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#f0f0f5]">
                        {MOCK_PROFILE_USER.name}
                    </span>
                    <span className="block truncate text-xs text-[#f0f0f5]/40">
                        {MOCK_PROFILE_USER.planLabel}
                    </span>
                </span>
            </Link>

            <button
                type="button"
                aria-label="Выйти из аккаунта"
                onClick={(event) => event.stopPropagation()}
                className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-[#f0f0f5]/30 transition-colors hover:bg-[#1a1a1c] hover:text-[#f0f0f5]/60",
                    SIDEBAR_FOCUS_RING
                )}
            >
                <LogOut className="size-4" aria-hidden="true" />
            </button>
        </div>
    );
}
