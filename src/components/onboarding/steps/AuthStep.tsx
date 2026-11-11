// ARCHITECT: вход и регистрация с кастомной валидацией и Google-входом.
// Имя — буквы/пробел/дефис, почта — формат, пароль — 4 критерия сложности
// с цветным индикатором. Ошибки inline, сабмит блокируется до валидности.

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/onboarding/TextField";
import { PasswordStrengthMeter } from "@/components/onboarding/PasswordStrengthMeter";
import { GoogleAuthButton } from "@/components/onboarding/GoogleAuthButton";
import { AuthModeTabs } from "@/components/onboarding/AuthModeTabs";
import type { AuthMode } from "@/components/onboarding/AuthModeTabs";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";

type FieldName = "name" | "email" | "password";

interface AuthStepProps {
    onNext: () => void;
    onBack: () => void;
}

export function AuthStep({ onNext, onBack }: AuthStepProps) {
    const [mode, setMode] = useState<AuthMode>("register");
    const [values, setValues] = useState({ name: "", email: "", password: "" });
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [showPassword, setShowPassword] = useState(false);

    const setValue = (field: FieldName, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validateField = (field: FieldName): string | undefined => {
        if (field === "name") {
            return mode === "register" ? validateName(values.name) : undefined;
        }
        if (field === "email") return validateEmail(values.email);
        if (mode === "register") return validatePassword(values.password);
        return values.password ? undefined : "Укажи пароль";
    };

    const handleBlur = (field: FieldName) => {
        const error = validateField(field);
        setErrors((prev) => ({ ...prev, [field]: error }));
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const fields: FieldName[] =
            mode === "register" ? ["name", "email", "password"] : ["email", "password"];
        const nextErrors: Partial<Record<FieldName, string>> = {};
        for (const field of fields) nextErrors[field] = validateField(field);
        setErrors(nextErrors);
        if (fields.every((field) => !nextErrors[field])) onNext();
    };

    return (
        <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-[#f0f0f5]">
                    {mode === "register" ? "Создать аккаунт" : "Вход в аккаунт"}
                </h2>
                <p className="mt-1 text-sm text-[#f0f0f5]/50">
                    {mode === "register"
                        ? "Прогресс и репетитор сохранятся между устройствами"
                        : "Продолжи с места, где остановился"}
                </p>
            </div>

            <AuthModeTabs mode={mode} onChange={(next) => { setMode(next); setErrors({}); }} />

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === "register" && (
                    <TextField
                        id="auth-name"
                        label="Имя"
                        value={values.name}
                        onChange={(value) => setValue("name", value)}
                        onBlur={() => handleBlur("name")}
                        error={errors.name}
                        placeholder="Как к тебе обращаться"
                        autoComplete="name"
                    />
                )}

                <TextField
                    id="auth-email"
                    label="Почта"
                    type="email"
                    value={values.email}
                    onChange={(value) => setValue("email", value)}
                    onBlur={() => handleBlur("email")}
                    error={errors.email}
                    placeholder="name@mail.com"
                    autoComplete="email"
                />

                <div>
                    <TextField
                        id="auth-password"
                        label="Пароль"
                        type={showPassword ? "text" : "password"}
                        value={values.password}
                        onChange={(value) => setValue("password", value)}
                        onBlur={() => handleBlur("password")}
                        error={errors.password}
                        placeholder="Минимум 8 символов"
                        autoComplete={mode === "register" ? "new-password" : "current-password"}
                    >
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                            className="flex size-11 items-center justify-center text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </TextField>
                    {mode === "register" && <PasswordStrengthMeter password={values.password} />}
                </div>

                <Button
                    type="submit"
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f0f0f5] text-sm font-medium text-black hover:bg-[#f0f0f5]/90"
                >
                    Продолжить
                    <ArrowRight className="size-4" />
                </Button>

                <div className="flex items-center gap-3 pt-1">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-[#f0f0f5]/40">или</span>
                    <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleAuthButton onAuthenticated={onNext} />
            </form>

            <div className="mt-4 flex justify-center">
                <Button
                    type="button"
                    onClick={onBack}
                    variant="ghost"
                    className="flex min-h-11 items-center gap-2 text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                >
                    <ArrowLeft className="size-4" />
                    Назад
                </Button>
            </div>
        </div>
    );
}