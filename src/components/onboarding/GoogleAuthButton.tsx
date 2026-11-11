// ARCHITECT: вход через Google — мок OAuth: реальный поток пойдёт через бэкенд
// (/auth/google), здесь имитация ответа с loading-состоянием, чтобы кнопка давала фидбек.
// ARCHITECT: поверхность вторичной кнопки — из lib/surfaces (стекло + border-white/5,
// на ховере border-white/15), чтобы она читалась в одном ряду с плитками.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS_SURFACE } from "@/lib/surfaces";
import { GoogleIcon } from "./GoogleIcon";

interface GoogleAuthButtonProps {
    onAuthenticated: () => void;
}

export function GoogleAuthButton({ onAuthenticated }: GoogleAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        if (isLoading) return;
        setIsLoading(true);
        window.setTimeout(() => onAuthenticated(), 700);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
                "flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full text-sm font-medium text-[#f0f0f5] transition-colors hover:border-white/15 hover:bg-white/[0.03] disabled:opacity-60",
                GLASS_SURFACE
            )}
        >
            {isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
                <GoogleIcon className="size-4.5" />
            )}
            {isLoading ? "Подключаемся…" : "Продолжить с Google"}
        </button>
    );
}