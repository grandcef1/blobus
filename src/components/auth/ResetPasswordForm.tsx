// ARCHITECT: форма нового пароля. Состояние ссылки проверяется запросом, а не берётся из адресной
// строки на веру: пока страница была открыта, токен мог истечь.
// ARCHITECT: после успеха токен убирается из URL (replace): иначе он остаётся в истории браузера и в
// скопированной ссылке, хотя уже использован.

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/PasswordField";
import { ApiError } from "@/api/client";
import { checkResetToken, resetPassword, type ResetTokenStatus } from "@/api/auth";
import { validatePassword, validatePasswordConfirm, type ValidationKey } from "@/lib/validation";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import { ResetPasswordStatus } from "./ResetPasswordStatus";

// ARCHITECT: "checking" — состояние до ответа: без него форма мигала бы «ссылка не подошла» на каждый
// корректный токен. Отсутствие токена проверять нечем — сразу invalid.
type Stage = "checking" | ResetTokenStatus | "done";

type FieldName = "password" | "confirm";

export function ResetPasswordForm() {
    const { t } = useTranslation("auth");
    const [searchParams, setSearchParams] = useSearchParams();
    const token = searchParams.get("token");
    // ARCHITECT: статус хранится вместе с токеном, за который получен, а «успех» и отказ сброса — в
    // отдельных флагах: так состояние выводится из данных, а не выставляется setState в эффекте
    // (правило react-hooks), и смена токена не показывает ответ по прежней ссылке.
    const [checked, setChecked] = useState<{ token: string; status: ResetTokenStatus } | null>(null);
    const [isDone, setIsDone] = useState(false);
    const [failure, setFailure] = useState<ResetTokenStatus | null>(null);
    const [values, setValues] = useState({ password: "", confirm: "" });
    const [errors, setErrors] = useState<Partial<Record<FieldName, ValidationKey>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        void checkResetToken(token).then((status) => {
            if (!cancelled) setChecked({ token, status });
        });
        return () => {
            cancelled = true;
        };
    }, [token]);

    const checkedStatus: Stage = !token
        ? "invalid"
        : checked?.token === token
          ? checked.status
          : "checking";
    const stage: Stage = isDone ? "done" : failure ?? checkedStatus;

    const setValue = (field: FieldName, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const nextErrors = {
            password: validatePassword(values.password),
            confirm: validatePasswordConfirm(values.password, values.confirm),
        };
        setErrors(nextErrors);
        if (nextErrors.password || nextErrors.confirm || !token) return;

        setIsSubmitting(true);
        try {
            await resetPassword(token, values.password);
            setSearchParams({}, { replace: true });
            setValues({ password: "", confirm: "" });
            setIsDone(true);
            toast.success(t("reset.successTitle"), t("reset.success"));
        } catch (error) {
            // ARCHITECT: отказ сброса значит одно из двух — ссылка истекла или не подошла; показываем
            // тот же статусный экран с действием «запросить новую», что и при проверке токена.
            setFailure(error instanceof ApiError && error.statusCode === 410 ? "expired" : "invalid");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (stage === "checking") {
        return (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-[#f0f0f5]/60">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("reset.checking")}
            </p>
        );
    }

    // ARCHITECT: «истекла», «не подошла» и «пароль обновлён» — один статусный компонент: вид у них
    // общий, различаются текст и действие.
    if (stage !== "valid") return <ResetPasswordStatus status={stage} />;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <PasswordField
                id="reset-password"
                name="password"
                mode="register"
                label={t("reset.fields.label")}
                placeholder={t("reset.fields.placeholder")}
                value={values.password}
                error={errors.password ? t(errors.password) : undefined}
                onChange={(value) => setValue("password", value)}
                onBlur={() =>
                    setErrors((previous) => ({ ...previous, password: validatePassword(values.password) }))
                }
            />

            {/* ARCHITECT: поле подтверждения — тот же компонент без метра: второй файл ради одного
                флага разошёлся бы с первым при любой правке глаза или автофилла. */}
            <PasswordField
                id="reset-password-confirm"
                name="password-confirm"
                mode="register"
                showStrengthMeter={false}
                label={t("reset.fields.confirmLabel")}
                placeholder={t("reset.fields.confirmPlaceholder")}
                value={values.confirm}
                error={errors.confirm ? t(errors.confirm) : undefined}
                onChange={(value) => setValue("confirm", value)}
                onBlur={() =>
                    setErrors((previous) => ({
                        ...previous,
                        confirm: validatePasswordConfirm(values.password, values.confirm),
                    }))
                }
            />

            <Button type="submit" disabled={isSubmitting} className={cn(PRIMARY_BUTTON, "w-full")}>
                {isSubmitting ? t("reset.submitting") : t("reset.submit")}
                {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            </Button>
        </form>
    );
}
