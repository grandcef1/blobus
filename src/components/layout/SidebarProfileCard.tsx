// ARCHITECT: карточка профиля внизу сайдбара — ссылка на /app/profile с аватаром, именем и
// тарифом. Выход — отдельная кнопка-сестра, а не вложенная в ссылку: интерактивный элемент
// внутри ссылки ломает семантику и порядок обхода клавиатурой.
// ARCHITECT: имя и аватар берутся из профиля (useProfile) — того же источника, что у страницы профиля:
// мок-имя и блобатар ушли, поэтому загруженное фото встаёт здесь сразу после инвалидации ["profile"].
// ARCHITECT: выход очищает auth-store и возвращает на лендинг: раньше кнопка была мёртвой.
// ARCHITECT: в сложенном виде остаётся центрированный аватар со ссылкой и title «Профиль».

import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { SIDEBAR_FOCUS_RING } from "./navigation";

interface SidebarProfileCardProps {
    isCollapsed: boolean;
}

export function SidebarProfileCard({ isCollapsed }: SidebarProfileCardProps) {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const navigate = useNavigate();
    const signOut = useAuthStore((state) => state.signOut);
    const user = useAuthStore((state) => state.user);
    // ARCHITECT: тихий режим: карточка висит на каждом экране приложения, тост об ошибке поднимает страница.
    const { profile } = useProfile({ silent: true });

    // ARCHITECT: имя профиля — основное; имя из store и общая заглушка остаются на случай пустой строки
    // (аккаунт без метаданных) и на время первой загрузки профиля.
    const displayName = profile?.displayName || user?.name || tCommon("profile.fallbackName");

    const handleSignOut = () => {
        signOut();
        navigate("/");
    };

    const avatar = (
        <UserAvatar
            avatarUrl={profile?.avatarUrl ?? null}
            providerAvatarUrl={profile?.providerAvatarUrl ?? null}
            displayName={displayName}
            className="size-8 bg-white/5"
        />
    );

    if (isCollapsed) {
        return (
            <div className="flex shrink-0 justify-center border-t border-white/5 py-3">
                <Link
                    to="/app/profile"
                    title={t("shell.profile")}
                    aria-label={t("shell.profile")}
                    className={cn(
                        "flex size-10 items-center justify-center rounded-full transition-colors hover:bg-[#141416]",
                        SIDEBAR_FOCUS_RING
                    )}
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
                        {displayName}
                    </span>
                    <span className="block truncate text-xs text-[#f0f0f5]/40">
                        {MOCK_PROFILE_USER.planLabel}
                    </span>
                </span>
            </Link>

            <button
                type="button"
                aria-label={t("shell.signOut")}
                onClick={handleSignOut}
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
