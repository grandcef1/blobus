// ARCHITECT: статусные экраны сброса (ссылка истекла / не подошла / пароль обновлён) вынесены из
// формы: с ними файл формы перевалил бы за лимит 150 строк (rules 5.2), а это один и тот же вид с
// разным текстом и действием.

import { Link } from "react-router-dom";
import { CircleAlert, Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { AuthStatus } from "./AuthStatus";
import { AUTH_SECONDARY_BUTTON } from "./auth.styles";

export type ResetLinkStatus = "expired" | "invalid" | "done";

interface ResetPasswordStatusProps {
    readonly status: ResetLinkStatus;
}

export function ResetPasswordStatus({ status }: ResetPasswordStatusProps) {
    const { t } = useTranslation("auth");

    if (status === "done") {
        return (
            <AuthStatus title={t("reset.successTitle")} body={t("reset.success")}>
                <Button asChild className={cn(PRIMARY_BUTTON, "w-full")}>
                    <Link to="/login">{t("reset.goToLogin")}</Link>
                </Button>
            </AuthStatus>
        );
    }

    const isExpired = status === "expired";

    return (
        <AuthStatus
            icon={
                isExpired ? (
                    <CircleAlert className="size-4" aria-hidden="true" />
                ) : (
                    <Link2Off className="size-4" aria-hidden="true" />
                )
            }
            title={t(isExpired ? "reset.expiredTitle" : "reset.invalidTitle")}
            body={t(isExpired ? "reset.expired" : "reset.invalid")}
        >
            {/* ARCHITECT: единственное действие на этом экране — запросить новую ссылку: тупика
                «ссылка не работает, и что теперь» здесь быть не должно. */}
            <Button asChild className={AUTH_SECONDARY_BUTTON}>
                <Link to="/forgot-password">{t("reset.requestNew")}</Link>
            </Button>
        </AuthStatus>
    );
}
