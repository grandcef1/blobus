// ARCHITECT: форма запроса сброса пароля. Ответ всегда нейтральный (anti-enumeration): экран
// «отправлено» не подтверждает существование аккаунта, а лишь сообщает, что письмо могло уйти.
// ARCHITECT: повторная отправка идёт с отсчётом 60 секунд — без него кнопка превращается в
// генератор писем при двойном клике.

import { useState, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/onboarding/TextField";
import { requestPasswordReset } from "@/api/auth";
import { validateEmail, type ValidationKey } from "@/lib/validation";
import { useCooldown } from "@/hooks/useCooldown";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import { AuthStatus } from "./AuthStatus";
import { AUTH_SECONDARY_BUTTON } from "./auth.styles";

const COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
    const { t } = useTranslation("auth");
    const [email, setEmail] = useState("");
    // ARCHITECT: в состоянии ключ словаря, а не текст: смена языка обновляет уже показанную ошибку.
    const [error, setError] = useState<ValidationKey | undefined>();
    const [isSent, setIsSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cooldown = useCooldown(COOLDOWN_SECONDS);

    const send = async (): Promise<void> => {
        setIsSubmitting(true);
        try {
            await requestPasswordReset(email.trim());
            setIsSent(true);
            cooldown.start();
            toast.success(t("forgot.sentTitle"), t("forgot.sent"));
        } catch {
            // ARCHITECT: мок не падает, но контракт бэкенда допускает отказ — сообщаем тостом, а не
            // alert: правило проекта — никаких нативных диалогов.
            toast.error(t("forgot.errorToast"), t("forgot.errorToastHint"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const nextError = validateEmail(email);
        setError(nextError);
        if (nextError) return;
        await send();
    };

    if (isSent) {
        return (
            <div className="flex flex-col gap-5">
                <AuthStatus
                    icon={<MailCheck className="size-4" aria-hidden="true" />}
                    title={t("forgot.sentTitle")}
                    body={t("forgot.sent")}
                    hint={t("forgot.sentHint")}
                />
                <Button
                    type="button"
                    onClick={() => void send()}
                    disabled={cooldown.active || isSubmitting}
                    className={cn(AUTH_SECONDARY_BUTTON, "disabled:cursor-not-allowed disabled:opacity-50")}
                >
                    {cooldown.active
                        ? t("forgot.resendIn", { seconds: cooldown.remaining })
                        : t("forgot.resend")}
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <TextField
                id="forgot-email"
                name="email"
                required
                label={t("fields.email.label")}
                type="email"
                placeholder={t("fields.email.placeholder")}
                autoComplete="email"
                value={email}
                error={error ? t(error) : undefined}
                onChange={(value) => {
                    setEmail(value);
                    if (error) setError(undefined);
                }}
                onBlur={() => setError(validateEmail(email))}
            />

            <Button type="submit" disabled={isSubmitting} className={cn(PRIMARY_BUTTON, "w-full")}>
                {isSubmitting ? t("forgot.submitting") : t("forgot.submit")}
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            </Button>
        </form>
    );
}
