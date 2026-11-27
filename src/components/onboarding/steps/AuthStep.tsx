// ARCHITECT: шаг мастера — тонкая обёртка над общей формой: заголовок, карточка и «Назад».
// Форма живёт в components/auth/AuthForm, потому что тот же вход нужен отдельной странице /login.
// ARCHITECT: вход через таб «Вход» завершает мастер сразу: у пользователя уже есть аккаунт и
// прогресс, повторный выбор репетитора ему не нужен. Регистрация продолжает мастер как раньше.
// ARCHITECT: вход ведёт на стартовую страницу приложения, а не в последнюю сессию: продолжение
// занятия — выбор из «Обзора», одинаковый для обоих входов в аккаунт.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { AuthForm } from "@/components/auth/AuthForm";
import type { AuthMode } from "@/components/onboarding/AuthModeTabs";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";
import { GHOST_BUTTON } from "@/lib/surfaces";
import type { AuthUser } from "@/api/auth";

interface AuthStepProps {
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

export function AuthStep({ onNext, onBack, step, totalSteps }: AuthStepProps) {
    const { t } = useTranslation("onboarding");
    const { t: tCommon } = useTranslation("common");
    const navigate = useNavigate();
    const [mode, setMode] = useState<AuthMode>("register");

    // ARCHITECT: пользователя в auth-store кладёт сама форма, поэтому здесь решается только маршрут.
    // ARCHITECT: решение по флагу онбординга, а не по табу: неполный аккаунт (в том числе после Google)
    // обязан дойти до теста уровня, а завершённый уходит в приложение сразу.
    const handleAuthenticated = (user: AuthUser) => {
        if (user.onboardingCompleted === false) {
            onNext();
            return;
        }

        navigate(APP_HOME_PATH, { replace: true });
    };

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.intro)}
                title={mode === "register" ? t("auth.titleRegister") : t("auth.titleLogin")}
                subtitle={
                    mode === "register"
                        ? t("auth.subtitleRegister")
                        : t("auth.subtitleLogin")
                }
                step={step}
                totalSteps={totalSteps}
            />

            <StepCard>
                <AuthForm
                    mode={mode}
                    onModeChange={setMode}
                    onAuthenticated={handleAuthenticated}
                />
            </StepCard>

            <div className="mt-4 flex">
                <Button type="button" onClick={onBack} variant="ghost" className={GHOST_BUTTON}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {t("shell.back")}
                </Button>
            </div>
        </div>
    );
}