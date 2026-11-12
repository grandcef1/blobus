// ARCHITECT: форма входа и регистрации — одна на мастер настройки и на страницу /login: при
// появлении второго входа её пришлось бы дублировать. Запись в auth-store делает сама форма,
// поэтому обе точки входа ведут себя одинаково, а вызывающий решает только маршрут после успеха.

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/onboarding/TextField";
import { PasswordStrengthMeter } from "@/components/onboarding/PasswordStrengthMeter";
import { GoogleAuthButton } from "@/components/onboarding/GoogleAuthButton";
import { AuthModeTabs, type AuthMode } from "@/components/onboarding/AuthModeTabs";
import { useAuthStore } from "@/store/auth";
import type { AuthUser } from "@/api/auth";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

type FieldName = "name" | "email" | "password";

export interface AuthFormProps {
    mode: AuthMode;
    onModeChange?: (mode: AuthMode) => void;
    onAuthenticated: (user: AuthUser) => void;
    showTabs?: boolean;
}

const EYE_BUTTON = "flex size-11 items-center justify-center text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70";

export function AuthForm({ mode, onModeChange, onAuthenticated, showTabs = true }: AuthFormProps) {
    const signIn = useAuthStore((state) => state.signIn);
    const signUp = useAuthStore((state) => state.signUp);
    const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

    const [values, setValues] = useState({ name: "", email: "", password: "" });
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [showPassword, setShowPassword] = useState(false);
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

    const validateField = (field: FieldName): string | undefined => {
        if (field === "name") return mode === "register" ? validateName(values.name) : undefined;
        if (field === "email") return validateEmail(values.email);
        if (mode === "register") return validatePassword(values.password);
        return values.password ? undefined : "Укажи пароль";
    };

    const handleBlur = (field: FieldName) => {
        setErrors((previous) => ({ ...previous, [field]: validateField(field) }));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const fields: FieldName[] =
            mode === "register" ? ["name", "email", "password"] : ["email", "password"];
        const nextErrors: Partial<Record<FieldName, string>> = {};
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
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        onAuthenticated(await signInWithGoogle());
    };


    return (
        <div>
            {showTabs && onModeChange && <AuthModeTabs mode={mode} onChange={handleModeChange} />}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                {mode === "register" && (
                    <TextField
                        id="auth-name" label="Имя" placeholder="Как к тебе обращаться" autoComplete="name"
                        value={values.name} error={errors.name}
                        onChange={(value) => setValue("name", value)} onBlur={() => handleBlur("name")}
                    />
                )}

                <TextField
                    id="auth-email" label="Почта" type="email" placeholder="name@mail.com" autoComplete="email"
                    value={values.email} error={errors.email}
                    onChange={(value) => setValue("email", value)} onBlur={() => handleBlur("email")}
                />

                <div>
                    <TextField
                        id="auth-password" label="Пароль" placeholder="Минимум 8 символов"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                        value={values.password} error={errors.password}
                        onChange={(value) => setValue("password", value)} onBlur={() => handleBlur("password")}
                    >
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                            className={EYE_BUTTON}
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" aria-hidden="true" />
                            ) : (
                                <Eye className="size-4" aria-hidden="true" />
                            )}
                        </button>
                    </TextField>
                    {mode === "register" && <PasswordStrengthMeter password={values.password} />}
                </div>

                <Button type="submit" disabled={isSubmitting} className={cn(PRIMARY_BUTTON, "w-full")}>
                    {isSubmitting ? "Проверяем…" : "Продолжить"}
                    {isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <ArrowRight className="size-4" aria-hidden="true" />
                    )}
                </Button>

                <div className="flex items-center gap-3 pt-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-[#f0f0f5]/40">или</span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleAuthButton onAuthenticated={handleGoogle} />
            </form>
        </div>
    );
}