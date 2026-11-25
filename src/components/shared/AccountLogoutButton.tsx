// ARCHITECT: выход с лендинга — та же кнопка, что в карточке профиля сайдбара (SidebarProfileCard):
// иконка LogOut и ключ dashboard.shell.signOut. Навигацию здесь не делаем: пользователь остаётся на
// лендинге, а гостевые CTA появляются сразу — маршрут сменит он сам.

import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { SIDEBAR_FOCUS_RING } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

interface AccountLogoutButtonProps {
    readonly className?: string;
}

export function AccountLogoutButton({ className }: AccountLogoutButtonProps) {
    const { t } = useTranslation("dashboard");
    const signOut = useAuthStore((state) => state.signOut);

    return (
        <button
            type="button"
            aria-label={t("shell.signOut")}
            title={t("shell.signOut")}
            onClick={() => signOut()}
            className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl text-[#f0f0f5]/30 transition-colors hover:bg-[#1a1a1c] hover:text-[#f0f0f5]/60",
                SIDEBAR_FOCUS_RING,
                className
            )}
        >
            <LogOut className="size-4" aria-hidden="true" />
        </button>
    );
}
