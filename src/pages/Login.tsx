// ARCHITECT: отдельный экран входа. Раньше «Войти» вело в мастер настройки, и пользователь с
// аккаунтом проходил выбор репетитора заново. Теперь вход — самостоятельная страница без шагов;
// фон, карточка и заголовок берутся у мастера, чтобы экран не выглядел чужеродным.
// ARCHITECT: после входа маршрут один — стартовая страница приложения («Обзор»), а не последняя
// сессия: вход с лендинга не должен открывать чат, продолжение занятия выбирается из «Обзора».
// ARCHITECT: редирект вычисляется до рендера формы, а фаза resolving отдаёт лоадер: страница входа не
// показывается ни кадра тому, кто уже авторизован, поэтому перехода «форма → дашборд» не видно.

import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthResolvingScreen } from "@/components/auth/AuthResolvingScreen";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { selectAuthStatus, useAuthStore } from "@/store/auth";
import { Seo } from "@/components/shared/Seo";
import { resolveReturnTo } from "@/lib/return-to";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/api/auth";

const ONBOARDING_PATH = "/onboarding";
// ARCHITECT: новый аккаунт (флаг онбординга серверный) открывает мастера сразу на тесте уровня:
// приветствие он прошёл при регистрации, показывать его второй раз незачем.
const ONBOARDING_ASSESSMENT_PATH = `${ONBOARDING_PATH}?step=assessment`;

// ARCHITECT: место после входа: неполный онбординг важнее возврата, а возврат разрешён только внутрь
// приложения (whitelist /app/ живёт в resolveReturnTo) — здесь только порядок решений.
function postAuthPath(user: AuthUser, state: unknown): string {
    if (user.onboardingCompleted === false) return ONBOARDING_ASSESSMENT_PATH;

    return resolveReturnTo(state) ?? APP_HOME_PATH;
}

export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation("auth");
    const status = useAuthStore(selectAuthStatus);
    const user = useAuthStore((state) => state.user);

    // ARCHITECT: пока сессия проверяется, ни формы, ни редиректа: решает фаза, а не пустой user.
    if (status === "resolving") return <AuthResolvingScreen />;

    // ARCHITECT: гейт онбординга живёт только здесь — решение владельца, /app не гейтится;
    // редирект только по явному false, отсутствие поля (legacy) не редиректит.
    if (user !== null) return <Navigate to={postAuthPath(user, location.state)} replace />;

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
                        // ARCHITECT: тот же расчёт маршрута, что у редиректа выше: расхождение ветвей
                        // дало бы разное место после входа и после перезагрузки страницы.
                        onAuthenticated={(user) =>
                            navigate(postAuthPath(user, location.state), { replace: true })
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
