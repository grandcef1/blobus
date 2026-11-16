// ARCHITECT: строка «Почта» в профиле: адрес, текстовый статус подтверждения и действие. Статус
// берётся из auth-store (единственный источник), а не из профильного мока — иначе два места
// рассказывали бы разное.
// ARCHITECT: подписи лежат в common: профиль — экран приложения, а не форма входа, поэтому auth
// остаётся словарём входа и мастера.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/api/auth";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

interface ProfileEmailRowProps {
    readonly email: string;
    readonly isVerified: boolean;
}

export function ProfileEmailRow({ email, isVerified }: ProfileEmailRowProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isSending, setIsSending] = useState(false);

    const handleVerify = async (): Promise<void> => {
        setIsSending(true);
        try {
            await resendVerificationEmail(email);
            toast.success(t("profile.email.sentToast"), t("profile.email.sentToastHint"));
            navigate("/verify-email?sent=1");
        } catch {
            toast.error(t("profile.email.errorToast"), t("profile.email.errorToastHint"));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-xs text-[#f0f0f5]/40">{t("profile.email.label")}</p>
                <p className="truncate text-sm text-[#f0f0f5]">{email}</p>
            </div>

            <div className="flex items-center gap-3">
                {/* ARCHITECT: статус написан словом, а не показан цветом: смысл читается и без
                    различения оттенков. */}
                <span className="text-sm text-[#f0f0f5]/60">
                    {isVerified ? t("profile.email.verified") : t("profile.email.unverified")}
                </span>

                {!isVerified && (
                    <Button
                        type="button"
                        onClick={() => void handleVerify()}
                        disabled={isSending}
                        className={cn(PRIMARY_BUTTON, "shrink-0 px-5")}
                    >
                        {t("profile.email.verify")}
                    </Button>
                )}
            </div>
        </div>
    );
}
