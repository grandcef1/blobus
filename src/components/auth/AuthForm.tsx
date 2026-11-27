// ARCHITECT: форма входа и регистрации — одна на мастер настройки и на страницу /login: при
// появлении второго входа её пришлось бы дублировать. Запись в auth-store делает сама форма,
// поэтому обе точки входа ведут себя одинаково, а вызывающий решает только маршрут после успеха.

import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/onboarding/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { AuthModeTabs, type AuthMode } from "@/components/onboarding/AuthModeTabs";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import type { AuthUser } from "@/api/auth";
import { ApiError } from "@/api/client";
import { toast } from "@/store/toast";
import i18n from "@/lib/i18n";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";
import type { ValidationKey } from "@/lib/validation";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

type FieldName = "name" | "email" | "password";

// ARCHITECT: причину отказа объясняем ключом словаря по статусу, а серверный текст в интерфейс не
// показываем: в нём бывают детали и адреса. Технические code/requestId уходят только в консоль.
// 0 — сети нет: client.ts уже положил в message безопасный текст из common, его и показываем.
function authErrorText(error: unknown, kind: "credentials" | "google", mode: AuthMode): string {
    if (!(error instanceof ApiError)) return i18n.t("errors.generic", { ns: "auth" });
    console.warn("auth: request failed", {
        status: error.statusCode,
        code: error.code,
        requestId: error.requestId,
    });
    if (error.statusCode === 0) return error.message;
    if (error.statusCode === 429) return i18n.t("errors.tooManyAttempts", { ns: "auth" });
    if (kind === "google") {
        return error.statusCode === 401 || error.statusCode === 403 || error.statusCode >= 500
            ? i18n.t("errors.googleFailed", { ns: "auth" })
            : i18n.t("errors.generic", { ns: "auth" });
    }
    if (error.statusCode === 401) return i18n.t("errors.signInFailed", { ns: "auth" });
    if (error.statusCode === 400 && mode === "register")
        return i18n.t("errors.signUpFailed", { ns: "auth" });
    return i18n.t("errors.generic", { ns: "auth" });
}

export interface AuthFormProps {
    mode: AuthMode;
    onModeChange?: (mode: AuthMode) => void;
    onAuthenticated: (user: AuthUser) => void;
    showTabs?: boolean;
}

export function AuthForm({ mode, onModeChange, onAuthenticated, showTabs = true }: AuthFormProps) {
    const { t } = useTranslation("auth");
    const signIn = useAuthStore((state) => state.signIn);
    const signUp = useAuthStore((state) => state.signUp);
    const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

    const [values, setValues] = useState({ name: "", email: "", password: "" });
    // ARCHITECT: в состоянии лежат ключи словаря, а не готовый текст: смена языка обновляет уже
    // показанные ошибки, а не оставляет их на прежнем языке.
    const [errors, setErrors] = useState<Partial<Record<FieldName, ValidationKey>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ARCHITECT: смена таба сбрасывает ошибки предыдущего режима, но не введённые значения.
    const handleModeChange = (next: AuthMode) => {
        setErrors({});
        onModeChange?.(next);
    };

    const setValue = (field: FieldName, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

    const validateField = (field: FieldName): ValidationKey | undefined => {
        if (field === "name") return mode === "register" ? validateName(values.name) : undefined;
        if (field === "email") return validateEmail(values.email);
        if (mode === "register") return validatePassword(values.password);
        return values.password ? undefined : "errors.passwordRequired";
    };

    const handleBlur = (field: FieldName) => {
        setErrors((previous) => ({ ...previous, [field]: validateField(field) }));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const fields: FieldName[] =
            mode === "register" ? ["name", "email", "password"] : ["email", "password"];
        const nextErrors: Partial<Record<FieldName, ValidationKey>> = {};
        for (const field of fields) nextErrors[field] = validateField(field);
        setErrors(nextErrors);
        if (fields.some((field) => nextErrors[field])) return;

        setIsSubmitting(true);
        try {
            const user =
                mode === "register"
                    ? await signUp(values.name, values.email, values.password)
                    : await signIn(values.email, values.password);
            onAuthenticated(user);
        } catch (error) {
            // ARCHITECT: без тоста отказ уходил исключением наверх и пользователь видел только замершую кнопку.
            toast.error(authErrorText(error, "credentials", mode));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        try {
            onAuthenticated(await signInWithGoogle());
        } catch (error) {
            // ARCHITECT: при редиректе на провайдера промис не завершается, поэтому сюда попадает только отказ
            // входа; причина берётся из словаря, а не из серверного текста.
            toast.error(authErrorText(error, "google", mode));
        }
    };

    return (
        <div>
            {showTabs && onModeChange && <AuthModeTabs mode={mode} onChange={handleModeChange} />}

            {/* ARCHITECT: провайдеры идут первыми — путь в один клик виден до полей, «или» отделяет
                их от формы email/пароль. */}
            <AuthProviderButtons onGoogle={handleGoogle} />

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                {mode === "register" && (
                    <TextField
                        id="auth-name"
                        name="name"
                        required
                        label={t("fields.name.label")}
                        placeholder={t("fields.name.placeholder")}
                        autoComplete="name"
                        value={values.name}
                        error={errors.name ? t(errors.name) : undefined}
                        onChange={(value) => setValue("name", value)}
                        onBlur={() => handleBlur("name")}
                    />
                )}

                <TextField
                    id="auth-email"
                    name="email"
                    required
                    label={t("fields.email.label")}
                    type="email"
                    placeholder={t("fields.email.placeholder")}
                    autoComplete={mode === "register" ? "email" : "username"}
                    value={values.email}
                    error={errors.email ? t(errors.email) : undefined}
                    onChange={(value) => setValue("email", value)}
                    onBlur={() => handleBlur("email")}
                />

                {/* ARCHITECT: поле пароля вместе с метром силы и ссылкой восстановления переехало
                    в PasswordField: форма с ним внутри переваливает за лимит 150 строк (rules 5.2),
                    а сам блок отвечает за три разные вещи и в форме только мешал чтению. */}
                <PasswordField
                    id="auth-password"
                    name="password"
                    mode={mode}
                    value={values.password}
                    error={errors.password ? t(errors.password) : undefined}
                    onChange={(value) => setValue("password", value)}
                    onBlur={() => handleBlur("password")}
                />

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(PRIMARY_BUTTON, "w-full")}
                >
                    {isSubmitting ? t("actions.submitting") : t("actions.submit")}
                    {isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <ArrowRight className="size-4" aria-hidden="true" />
                    )}
                </Button>
            </form>
        </div>
    );
}
