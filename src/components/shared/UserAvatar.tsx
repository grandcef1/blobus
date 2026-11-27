// ARCHITECT: аватар ученика — одна разметка для профиля, рельсы и мобильной шапки: своя картинка, иначе
// картинка провайдера, иначе нейтральная иконка. Блобатар здесь не показывается: он персонаж репетитора,
// а не лицо ученика. Битый источник помечается локально: сервер ссылку уже отдал, повторного запроса нет.
// shortcut: signed URL живёт 10 минут, поэтому долго открытая вкладка держит битую ссылку до следующего
// запроса профиля; лечится более коротким staleTime, если это станет заметно.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
    readonly avatarUrl: string | null;
    readonly providerAvatarUrl: string | null;
    readonly displayName: string;
    /** Размер, радиус и тон плашки: size-*, rounded-*, bg-*. */
    readonly className?: string;
    readonly iconClassName?: string;
}

export function UserAvatar({
    avatarUrl,
    providerAvatarUrl,
    displayName,
    className,
    iconClassName = "size-4",
}: UserAvatarProps) {
    const { t } = useTranslation("dashboard");
    const [brokenSource, setBrokenSource] = useState<string | null>(null);

    const source = avatarUrl ?? providerAvatarUrl;
    const showImage = source !== null && source !== brokenSource;

    return (
        <span
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1c]",
                className
            )}
        >
            {showImage && source !== null ? (
                <img
                    src={source}
                    alt={t("profile.avatar.alt")}
                    title={displayName}
                    onError={() => setBrokenSource(source)}
                    className="size-full object-cover"
                />
            ) : (
                <User
                    className={cn("text-[#f0f0f5]/40", iconClassName)}
                    strokeWidth={1.5}
                    aria-hidden="true"
                />
            )}
        </span>
    );
}
