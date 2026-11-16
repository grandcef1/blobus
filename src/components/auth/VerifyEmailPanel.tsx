// ARCHITECT: панель подтверждения почты: состояния «проверяем / проверь почту / подтверждено / истекла
// / не подошла» живут здесь, а страница отвечает только за рамку — иначе файл страницы перевалил бы
// за лимит 150 строк (rules 5.2).
// ARCHITECT: форма повторной отправки вынесена отдельно (ResendVerificationForm): она нужна трём
// состояниям из пяти, и вместе с панелью файл перевалил бы за лимит 150 строк.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Link2Off, Loader2, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { verifyEmailToken, type VerifyEmailResult } from "@/api/auth";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { useAuthStore } from "@/store/auth";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { AuthStatus } from "./AuthStatus";
import { ResendVerificationForm } from "./ResendVerificationForm";
import { AUTH_SECONDARY_BUTTON } from "./auth.styles";

interface VerifyEmailPanelProps {
    readonly token: string | null;
    /** Режим «письмо отправлено» (?sent=1): показывается после регистрации и из профиля. */
    readonly sent: boolean;
    readonly defaultEmail: string;
    readonly isAuthenticated: boolean;
}

export function VerifyEmailPanel({
    token,
    sent,
    defaultEmail,
    isAuthenticated,
}: VerifyEmailPanelProps) {
    const { t } = useTranslation("auth");
    // ARCHITECT: результат хранится вместе с токеном, за который он получен: смена токена в адресной
    // строке снова показывает «проверяем», а не ответ по прежней ссылке. Состояние выводится из
    // данных — setState внутри эффекта запрещён правилом react-hooks.
    const [checked, setChecked] = useState<{ token: string; result: VerifyEmailResult } | null>(null);
    const markEmailVerified = useAuthStore((state) => state.markEmailVerified);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        void verifyEmailToken(token).then((result) => {
            if (cancelled) return;
            setChecked({ token, result });
            // ARCHITECT: статус аккаунта обновляет единственный владелец — auth-store: иначе профиль
            // и мастер продолжали бы считать почту неподтверждённой. Для гостя действие ничего не делает.
            if (result === "verified") markEmailVerified();
        });
        return () => {
            cancelled = true;
        };
    }, [token, markEmailVerified]);

    const stage: "checking" | "idle" | "sent" | VerifyEmailResult = token
        ? checked?.token === token
            ? checked.result
            : "checking"
        : sent
          ? "sent"
          : "idle";

    if (stage === "checking") {
        return (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-[#f0f0f5]/60">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("verify.checking")}
            </p>
        );
    }

    if (stage === "verified") {
        return (
            <AuthStatus
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
                title={t("verify.verifiedTitle")}
                body={t("verify.verified")}
            >
                <Button asChild className={cn(PRIMARY_BUTTON, "w-full")}>
                    <Link to={isAuthenticated ? APP_HOME_PATH : "/login"}>
                        {isAuthenticated ? t("verify.toOverview") : t("verify.toLogin")}
                    </Link>
                </Button>
            </AuthStatus>
        );
    }

    if (stage === "sent") {
        return (
            <AuthStatus
                icon={<MailCheck className="size-4" aria-hidden="true" />}
                title={t("verify.sent.title")}
                body={
                    defaultEmail
                        ? t("verify.sent.bodyWithEmail", { email: defaultEmail })
                        : t("verify.sent.body")
                }
                hint={t("verify.sent.hint")}
            >
                <ResendVerificationForm defaultEmail={defaultEmail} />
                {/* ARCHITECT: гейт мягкий: без подтверждения доступ к приложению сохраняется —
                    человек не остаётся в тупике, если письмо не дошло. */}
                <Button asChild className={AUTH_SECONDARY_BUTTON}>
                    <Link to={APP_HOME_PATH}>{t("verify.sent.continue")}</Link>
                </Button>
            </AuthStatus>
        );
    }

    if (stage === "idle") {
        return (
            <AuthStatus
                icon={<Mail className="size-4" aria-hidden="true" />}
                title={t("verify.idleTitle")}
                body={t("verify.idle")}
                hint={t("verify.idleHint")}
            >
                <ResendVerificationForm defaultEmail={defaultEmail} />
            </AuthStatus>
        );
    }

    const isExpired = stage === "expired";

    return (
        <AuthStatus
            icon={
                isExpired ? (
                    <CircleAlert className="size-4" aria-hidden="true" />
                ) : (
                    <Link2Off className="size-4" aria-hidden="true" />
                )
            }
            title={t(isExpired ? "verify.expiredTitle" : "verify.invalidTitle")}
            body={t(isExpired ? "verify.expired" : "verify.invalid")}
        >
            <ResendVerificationForm defaultEmail={defaultEmail} />
        </AuthStatus>
    );
}
