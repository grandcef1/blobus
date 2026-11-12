// ARCHITECT: шаг мастера — тонкая обёртка над общей формой: заголовок, карточка и «Назад».
// Форма живёт в components/auth/AuthForm, потому что тот же вход нужен отдельной странице /login.
// ARCHITECT: вход через таб «Вход» завершает мастер сразу: у пользователя уже есть аккаунт и
// прогресс, повторный выбор репетитора ему не нужен. Регистрация продолжает мастер как раньше.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { AuthForm } from "@/components/auth/AuthForm";
import type { AuthMode } from "@/components/onboarding/AuthModeTabs";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { GHOST_BUTTON } from "@/lib/surfaces";

interface AuthStepProps {
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

export function AuthStep({ onNext, onBack, step, totalSteps }: AuthStepProps) {
    const navigate = useNavigate();
    const [mode, setMode] = useState<AuthMode>("register");

    // ARCHITECT: пользователя в auth-store кладёт сама форма, поэтому здесь решается только
    // маршрут: вход уходит в приложение, регистрация продолжает мастер.
    const handleAuthenticated = () => {
        if (mode === "login") {
            navigate("/app", { replace: true });
            return;
        }
        onNext();
    };

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.intro}
                title={mode === "register" ? "Создать аккаунт" : "Вход в аккаунт"}
                subtitle={
                    mode === "register"
                        ? "Прогресс и репетитор сохранятся между устройствами"
                        : "Продолжи с места, где остановился"
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
                    Назад
                </Button>
            </div>
        </div>
    );
}