// ARCHITECT: поле пароля вынесено из AuthForm: у него своя логика — переключатель видимости,
// метка силы в регистрации и ссылка восстановления во входе. Внутри формы это перевалило бы
// за лимит 150 строк на файл (project-rules 5.2).
// ARCHITECT: ссылка восстановления показывается только в режиме входа: в регистрации пароля ещё
// нет, и вопрос «Забыли пароль?» там смысла не несёт.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { TextField } from "@/components/onboarding/TextField";
import { PasswordStrengthMeter } from "@/components/onboarding/PasswordStrengthMeter";
import type { AuthMode } from "@/components/onboarding/AuthModeTabs";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
    id: string;
    name: string;
    value: string;
    mode: AuthMode;
    onChange: (value: string) => void;
    onBlur: () => void;
    error?: string;
    // ARCHITECT: два флага вместо второго компонента пароля: метру и ссылке восстановления нужны
    // разные экраны (регистрация / вход / сброс), а логика глаза и автофилла у поля одна.
    // Дефолты выводятся из mode, поэтому AuthForm не меняется и ведёт себя как раньше.
    showStrengthMeter?: boolean;
    showForgotLink?: boolean;
    /** Подписи переопределяются для переиспользования: «Новый пароль», «Повтори пароль». */
    label?: string;
    placeholder?: string;
}

const EYE_BUTTON = "flex size-11 items-center justify-center text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/70";

// ARCHITECT: min-h-11 держит планку касания 44px (rules 10) — ссылка в строке формы иначе
// остаётся высотой в одну строку текста. Фокус-кольцо обязательно: ссылка доступна с клавиатуры.
const FORGOT_LINK = cn(
    "inline-flex min-h-11 items-center text-sm text-[#f0f0f5]/50 underline underline-offset-4 transition-colors hover:text-[#f0f0f5]",
    FOCUS_RING
);

// ARCHITECT: aria-label намеренно не ставится: видимый текст «Забыли пароль?» сам описывает
// действие, а отдельное имя разошлось бы с видимой меткой (WCAG 2.5.3 Label in Name).
export function PasswordField({
    id,
    name,
    value,
    mode,
    onChange,
    onBlur,
    error,
    showStrengthMeter,
    showForgotLink,
    label,
    placeholder,
}: PasswordFieldProps) {
    const { t } = useTranslation("auth");
    const [isVisible, setIsVisible] = useState(false);

    const withMeter = showStrengthMeter ?? mode === "register";
    const withForgotLink = showForgotLink ?? mode === "login";

    return (
        <div>
            <TextField
                id={id}
                name={name}
                required
                label={label ?? t("fields.password.label")}
                placeholder={placeholder ?? t("fields.password.placeholder")}
                type={isVisible ? "text" : "password"}
                // ARCHITECT: пока показан метр, поле заведомо про новый пароль — менеджер паролей
                // должен предлагать генерацию, а не подстановку старого.
                autoComplete={withMeter || mode === "register" ? "new-password" : "current-password"}
                value={value}
                error={error}
                onChange={onChange}
                onBlur={onBlur}
            >
                <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    aria-label={
                        isVisible ? t("fields.password.hide") : t("fields.password.show")
                    }
                    className={EYE_BUTTON}
                >
                    {isVisible ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                        <Eye className="size-4" aria-hidden="true" />
                    )}
                </button>
            </TextField>

            {withMeter && <PasswordStrengthMeter password={value} />}

            {withForgotLink && (
                <div className="mt-1 flex justify-end">
                    <Link to="/forgot-password" className={FORGOT_LINK}>
                        {t("fields.password.forgot")}
                    </Link>
                </div>
            )}
        </div>
    );
}
