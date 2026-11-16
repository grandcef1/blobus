// ARCHITECT: публичный /reset-password. Токен читает форма — страница отвечает только за рамку и
// заголовок: у статусных состояний (истёк / невалиден / успех) тот же StepHeader, поэтому переход
// между ними не двигает экран.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { DevMockHint } from "@/components/auth/DevMockHint";
import { AUTH_META_LINE, AUTH_TEXT_LINK } from "@/components/auth/auth.styles";
import { Seo } from "@/components/shared/Seo";

export function ResetPasswordPage() {
    const { t } = useTranslation("auth");

    return (
        <OnboardingShell progress={0}>
            <Seo indexable={false} title={t("reset.metaTitle")} />
            <div className="mx-auto w-full max-w-xl px-6">
                <StepHeader
                    eyebrow={t("reset.eyebrow")}
                    title={t("reset.title")}
                    subtitle={t("reset.subtitle")}
                />

                <StepCard>
                    <ResetPasswordForm />
                </StepCard>

                <DevMockHint />

                <p className={AUTH_META_LINE}>
                    <Link to="/login" className={AUTH_TEXT_LINK}>
                        {t("reset.goToLogin")}
                    </Link>
                </p>
            </div>
        </OnboardingShell>
    );
}
