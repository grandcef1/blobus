// ARCHITECT: поле формы с label, inline-ошибкой и слотом для суффикса (глаз пароля).
// Ошибка связана через aria-describedby, шрифт инпута 16px — iOS не зумит фокус.
// ARCHITECT: поверхность инпута — из lib/surfaces (стекло вместо непрозрачного
// #141416), чтобы фон оболочки просвечивал и поле совпадало по токенам с карточками.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { INPUT_SURFACE } from "@/lib/surfaces";

interface TextFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: string;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    // ARCHITECT: name нужен менеджерам паролей для автозаполнения; без него они опираются
    // только на id и autocomplete. Необязательный: остальные вызовы ничего не передают.
    name?: string;
    /** Только семантика для скринридеров: форма объявлена noValidate, нативная проверка выключена. */
    required?: boolean;
    children?: ReactNode;
}

export function TextField({
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    type = "text",
    placeholder,
    autoComplete,
    name,
    required,
    children,
}: TextFieldProps) {
    const errorId = `${id}-error`;

    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm text-[#f0f0f5]/70">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    required={required}
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(
                        INPUT_SURFACE,
                        children && "pr-14",
                        error
                            ? "border-rose-400/40 ring-1 ring-rose-400/50 focus:ring-rose-400/60"
                            : "focus:ring-[#f0f0f5]/20"
                    )}
                />
                {children && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">{children}</div>
                )}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-xs text-rose-300">
                    {error}
                </p>
            )}
        </div>
    );
}