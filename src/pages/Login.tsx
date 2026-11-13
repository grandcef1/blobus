// ARCHITECT: отдельный экран входа. Раньше «Войти» вело в мастер настройки, и пользователь с
// аккаунтом проходил выбор репетитора заново. Теперь вход — самостоятельная страница без шагов;
// фон, карточка и заголовок берутся у мастера, чтобы экран не выглядел чужеродным.
// ARCHITECT: после входа маршрут один — стартовая страница приложения («Обзор»), а не последняя
// сессия: вход с лендинга не должен открывать чат, продолжение занятия выбирается из «Обзора».

import { Link, Navigate, useNavigate } from "react-router-dom";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { AuthForm } from "@/components/auth/AuthForm";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

export function Login() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    useDocumentTitle("Вход");

    // ARCHITECT: полоса прогресса мастера на одиночном экране смысла не несёт — 0 оставляет
    // только фон и шторку оболочки.
    if (user) return <Navigate to={APP_HOME_PATH} replace />;

    return (
        <OnboardingShell progress={0}>
            <div className="mx-auto w-full max-w-xl px-6">
                <StepHeader
                    eyebrow="Аккаунт"
                    title="Вход в аккаунт"
                    subtitle="Продолжи с места, где остановился"
                />

                <StepCard>
                    <AuthForm
                        mode="login"
                        showTabs={false}
                        onAuthenticated={() => navigate(APP_HOME_PATH, { replace: true })}
                    />
                </StepCard>

                <p className="mt-4 text-center text-sm text-[#f0f0f5]/50">
                    Нет аккаунта?{" "}
                    <Link
                        to="/onboarding"
                        className={cn("text-[#f0f0f5] underline transition-colors hover:no-underline", FOCUS_RING)}
                    >
                        Создать
                    </Link>
                </p>
            </div>
        </OnboardingShell>
    );
}
