// ARCHITECT: у гостя children возвращаются без контейнера, поэтому панель и мобильное меню выглядят
// в точности как раньше; у вошедшего вариант решает вид узла: chip — плашка аккаунта, text — кнопка
// перехода. Вариант влияет только на ветку вошедшего, гость его не замечает.
// ARCHITECT: аватар берётся из того же источника, что карточка профиля в сайдбаре (MOCK_PROFILE_USER),
// иначе в шапке и в сайдбаре были бы разные лица.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { AccountLogoutButton } from "@/components/shared/AccountLogoutButton";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

// ARCHITECT: база текстовой ветки — только структура (размер как у Button size lg, радиус, whitespace,
// фокус-ринг, transition). Цвета и hover-цвета приходят из className секции: так база не навязывает чужую
// hover-пару, иначе tailwind-merge оставил бы hover:text без конфликта (светлый текст на светлом фоне).
const TEXT_CTA_BASE =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-8 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// ARCHITECT: тон вторичной пилюли — как у «Пример урока» в hero; секция примешивает к нему свою ширину.
export const SECONDARY_CTA =
    "rounded-full shadow-none border border-[#f0f0f5]/30 bg-transparent text-[#f0f0f5] hover:bg-[#f0f0f5]/10 hover:text-[#f0f0f5]";

interface AuthAwareCtaProps {
    readonly children: ReactNode;
    readonly className?: string;
    readonly variant?: "chip" | "text";
}

export function AuthAwareCta({ children, className, variant = "chip" }: AuthAwareCtaProps) {
    const { t } = useTranslation("common");
    const { t: tLanding } = useTranslation("landing");
    const user = useAuthStore((state) => state.user);

    // ARCHITECT: гость получает children как есть независимо от варианта — обёртка сдвинула бы flex/gap.
    if (user === null) return <>{children}</>;

    // ARCHITECT: лендинг-CTA значит «продолжить» и всегда ведёт в дашборд; принуждение к онбордингу живёт
    // только в Login.tsx на входе (OAuth/пароль), секции его не дублируют.
    if (variant === "text") {
        return (
            <Link to={APP_HOME_PATH} className={cn(TEXT_CTA_BASE, className)}>
                {tLanding("cta.continueLearning")}
            </Link>
        );
    }

    // ARCHITECT: чип и выход — соседи в общем контейнере: интерактивная кнопка внутри ссылки ломала бы
    // семантику и порядок обхода клавиатурой. className секции (ширина/центрирование) уходит контейнеру.
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* ARCHITECT: h-9 совпадает с высотой кнопок Button по умолчанию, поэтому шапка не прыгает. */}
            <Link
                to={APP_HOME_PATH}
                className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 text-[#f0f0f5] transition-colors hover:border-white/15 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]/60"
            >
                <BlobatarAvatar id={MOCK_PROFILE_USER.blobatarId} className="size-6 bg-white/5" />
                <span className="max-w-28 truncate text-sm">{user.name}</span>
                <span className="text-xs text-[#f0f0f5]/70">{t("actions.continue")}</span>
                <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <AccountLogoutButton />
        </div>
    );
}
