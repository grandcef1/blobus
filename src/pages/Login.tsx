// ARCHITECT: отдельный экран входа. Раньше «Войти» вело в мастер настройки, и пользователь с
// аккаунтом проходил выбор репетитора заново. Теперь вход — самостоятельная страница без шагов;
// фон, карточка и заголовок берутся у мастера, чтобы экран не выглядел чужеродным.
// ARCHITECT: после входа маршрут один — стартовая страница приложения («Обзор»), а не последняя
// сессия: вход с лендинга не должен открывать чат, продолжение занятия выбирается из «Обзора».

import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { Seo } from "@/components/shared/Seo";
import { resolveReturnTo } from "@/lib/return-to";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const ONBOARDING_PATH = "/onboarding";

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation("auth");
    const user = useAuthStore((state) => state.user);

    // ARCHITECT: флаг серверный (ТЗ-1); редирект только по явному false, отсутствие поля (legacy) не
    // редиректит; гейт живёт только здесь — решение владельца, /app не гейтится.
    // ARCHITECT: полоса прогресса мастера на одиночном экране смысла не несёт — 0 оставляет
    // только фон и шторку оболочки.
    if (user)
        return (
            <Navigate
                to={user.onboardingCompleted === false ? ONBOARDING_PATH : APP_HOME_PATH}
                replace
            />
        );

    return (
        <OnboardingShell progress={0}>
            {/* ARCHITECT: вход закрыт от индексации: заголовок вкладки — прежний «Вход — Blobus». */}
            <Seo indexable={false} title={t("login.metaTitle")} />
            <div className="mx-auto w-full max-w-xl px-6">
                <StepHeader
                    eyebrow={t("login.eyebrow")}
                    title={t("login.title")}
                    subtitle={t("login.subtitle")}
                />

                <StepCard>
                    <AuthForm
                        mode="login"
                        showTabs={false}
                        // ARCHITECT: возврат в исходную точку только если она внутри приложения:
                        // ProtectedRoute положил её в state.from, а guard отсеивает чужое.
                        // ARCHITECT: неполный онбординг важнее возврата: вход нового аккаунта должен
                        // пройти мастер, а не открыть приложение.
                        onAuthenticated={(user) =>
                            navigate(
                                user.onboardingCompleted === false
                                    ? ONBOARDING_PATH
                                    : (resolveReturnTo(location.state) ?? APP_HOME_PATH),
                                { replace: true }
                            )
                        }
                    />
                </StepCard>

                <p className="mt-4 text-center text-sm text-[#f0f0f5]/50">
                    {t("login.noAccount")}{" "}
                    <Link
                        to={ONBOARDING_PATH}
                        className={cn(
                            "text-[#f0f0f5] underline transition-colors hover:no-underline",
                            FOCUS_RING
                        )}
                    >
                        {t("login.create")}
                    </Link>
                </p>
            </div>
        </OnboardingShell>
    );
}
