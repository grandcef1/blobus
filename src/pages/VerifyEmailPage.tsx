// ARCHITECT: публичный /verify-email. Токен из ссылки письма читается здесь и передаётся панели:
// страница не знает о состояниях проверки, а панель не знает о маршрутах.

import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepCard } from "@/components/onboarding/StepCard";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";
import { DevMockHint } from "@/components/auth/DevMockHint";
import { AUTH_META_LINE, AUTH_TEXT_LINK } from "@/components/auth/auth.styles";
import { useAuthStore } from "@/store/auth";
import { Seo } from "@/components/shared/Seo";

export function VerifyEmailPage() {
    const { t } = useTranslation("auth");
    const [searchParams] = useSearchParams();
    const user = useAuthStore((state) => state.user);

    return (
        <OnboardingShell progress={0}>
            <Seo indexable={false} title={t("verify.metaTitle")} />
            <div className="mx-auto w-full max-w-xl px-6">
                <StepHeader
                    eyebrow={t("verify.eyebrow")}
                    title={t("verify.title")}
                    subtitle={t("verify.subtitle")}
                />

                <StepCard>
                    <VerifyEmailPanel
                        token={searchParams.get("token")}
                        sent={searchParams.get("sent") === "1"}
                        defaultEmail={user?.email ?? ""}
                        isAuthenticated={user !== null}
                    />
                </StepCard>

                <DevMockHint />

                <p className={AUTH_META_LINE}>
                    <Link to="/login" className={AUTH_TEXT_LINK}>
                        {t("verify.toLogin")}
                    </Link>
                </p>
            </div>
        </OnboardingShell>
    );
}
