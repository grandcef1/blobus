// ARCHITECT: поле формы с label, inline-ошибкой и слотом для суффикса (глаз пароля).
// Ошибка связана через aria-describedby, шрифт инпута 16px — iOS не зумит фокус.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
                    type={type}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(
                        "w-full rounded-xl bg-[#141416] px-4 py-3 text-base text-[#f0f0f5] transition-colors",
                        "placeholder:text-[#f0f0f5]/25 focus:outline-none focus:ring-2",
                        children && "pr-14",
                        error
                            ? "ring-1 ring-rose-400/50 focus:ring-rose-400/60"
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