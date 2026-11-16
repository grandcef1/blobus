// ARCHITECT: форма повторной отправки письма-подтверждения. Одна на три состояния панели: в «проверь
// почту», «ссылка истекла» и «ссылка не подошла» человек делает ровно одно действие — просит письмо
// заново. Отсчёт 60 секунд не даёт превратить кнопку в генератор писем.

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/onboarding/TextField";
import { resendVerificationEmail } from "@/api/auth";
import { validateEmail, type ValidationKey } from "@/lib/validation";
import { useCooldown } from "@/hooks/useCooldown";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

const COOLDOWN_SECONDS = 60;

interface ResendVerificationFormProps {
    readonly defaultEmail: string;
}

export function ResendVerificationForm({ defaultEmail }: ResendVerificationFormProps) {
    const { t } = useTranslation("auth");
    // ARCHITECT: префилл из аккаунта — не начальное значение useState, а fallback: адрес может
    // появиться позже (стор гидратируется), а эффект с setState давал бы лишний рендер и запрещён
    // правилом react-hooks.
    const [editedEmail, setEditedEmail] = useState<string | null>(null);
    const email = editedEmail ?? defaultEmail;
    const [error, setError] = useState<ValidationKey | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cooldown = useCooldown(COOLDOWN_SECONDS);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const nextError = validateEmail(email);
        setError(nextError);
        if (nextError) return;

        setIsSubmitting(true);
        try {
            await resendVerificationEmail(email.trim());
            cooldown.start();
            toast.success(t("verify.resendToast"), t("verify.resendSent"));
        } catch {
            toast.error(t("verify.errorToast"), t("verify.errorToastHint"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <TextField
                id="verify-email"
                name="email"
                required
                label={t("fields.email.label")}
                type="email"
                placeholder={t("fields.email.placeholder")}
                autoComplete="email"
                value={email}
                error={error ? t(error) : undefined}
                onChange={(value) => {
                    setEditedEmail(value);
                    if (error) setError(undefined);
                }}
                onBlur={() => setError(validateEmail(email))}
            />

            <Button
                type="submit"
                disabled={cooldown.active || isSubmitting}
                className={cn(PRIMARY_BUTTON, "w-full disabled:cursor-not-allowed")}
            >
                {cooldown.active
                    ? t("verify.resendIn", { seconds: cooldown.remaining })
                    : t("verify.resend")}
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            </Button>
        </form>
    );
}
