// ARCHITECT: у гостя children возвращаются без контейнера, поэтому панель и мобильное меню выглядят
// в точности как раньше; у вошедшего одна плашка заменяет пару кнопок и ведёт прямо в кабинет.
// ARCHITECT: аватар берётся из того же источника, что карточка профиля в сайдбаре (MOCK_PROFILE_USER),
// иначе в шапке и в сайдбаре были бы разные лица.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

interface AuthAwareCtaProps {
    readonly children: ReactNode;
    readonly className?: string;
}

export function AuthAwareCta({ children, className }: AuthAwareCtaProps) {
    const { t } = useTranslation("common");
    const user = useAuthStore((state) => state.user);

    // ARCHITECT: гость получает children как есть — обёртка сдвинула бы flex/gap и изменила вид кнопок.
    if (user === null) return <>{children}</>;

    return (
        <Link
            to={APP_HOME_PATH}
            className={cn(
                // ARCHITECT: h-9 совпадает с высотой кнопок Button по умолчанию, поэтому шапка не прыгает.
                "flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 text-[#f0f0f5] transition-colors hover:border-white/15 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]/60",
                className
            )}
        >
            <BlobatarAvatar id={MOCK_PROFILE_USER.blobatarId} className="size-6 bg-white/5" />
            <span className="max-w-28 truncate text-sm">{user.name}</span>
            <span className="text-xs text-[#f0f0f5]/70">{t("actions.continue")}</span>
            <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        </Link>
    );
}