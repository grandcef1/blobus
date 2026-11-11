// ARCHITECT: фирменный знак Google — брендовое исключение из монохрома,
// узнаваемость важнее палитры; размер фиксирован, чтобы не плыл в кнопке.

interface GoogleIconProps {
    className?: string;
}

export function GoogleIcon({ className }: GoogleIconProps) {
    return (
        <svg viewBox="0 0 18 18" className={className} aria-hidden="true" focusable="false">
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.04-3.7H.96v2.34A9 9 0 0 0 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.96 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.46.35 2.84.96 4.06l3-2.34z"
            />
            <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.94l3 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
        </svg>
    );
}