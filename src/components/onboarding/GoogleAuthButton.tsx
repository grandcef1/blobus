// ARCHITECT: вход через Google — мок OAuth: реальный поток пойдёт через бэкенд
// (/auth/google), здесь имитация ответа с loading-состоянием, чтобы кнопка давала фидбек.

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
            className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full border border-white/15 bg-transparent text-sm font-medium text-[#f0f0f5] transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-60"
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