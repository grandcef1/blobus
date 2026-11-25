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
import { Button } from "@/components/ui/button";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const ONBOARDING_PATH = "/onboarding";

// ARCHITECT: текстовая ветка повторяет вид соседней кнопки «Пример урока» в hero: тот же Button
// variant/size и токены, поэтому стиль не выдуман, а взят у неё (см. HeroSection), плюс ширина от вызова.
const SECONDARY_CTA =
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

    // ARCHITECT: решение о маршруте совпадает с Login.tsx и живёт только здесь — секции его не дублируют;
    // отсутствие поля (legacy) трактуется как «пройден», редирект только по явному false.
    if (variant === "text") {
        return (
            <Button asChild variant="outline" size="lg" className={cn(SECONDARY_CTA, className)}>
                <Link to={user.onboardingCompleted === false ? ONBOARDING_PATH : APP_HOME_PATH}>
                    {tLanding("cta.continueLearning")}
                </Link>
            </Button>
        );
    }

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
