// ARCHITECT: публичный /forgot-password. Оболочка, заголовок и карточка — как у /login: экран часть
// того же потока, и чужеродная рамка читалась бы как другой сайт.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { DevMockHint } from "@/components/auth/DevMockHint";
import { AUTH_META_LINE, AUTH_TEXT_LINK } from "@/components/auth/auth.styles";
import { Seo } from "@/components/shared/Seo";

export function ForgotPasswordPage() {
    const { t } = useTranslation("auth");

    return (
        <OnboardingShell progress={0}>
            <Seo indexable={false} title={t("forgot.metaTitle")} />
            <div className="mx-auto w-full max-w-xl px-6">
                <StepHeader
                    eyebrow={t("forgot.eyebrow")}
                    title={t("forgot.title")}
                    subtitle={t("forgot.subtitle")}
                />

                <StepCard>
                    <ForgotPasswordForm />
                </StepCard>

                <DevMockHint />

                <p className={AUTH_META_LINE}>
                    <Link to="/login" className={AUTH_TEXT_LINK}>
                        {t("forgot.backToLogin")}
                    </Link>
                </p>
            </div>
        </OnboardingShell>
    );
}
