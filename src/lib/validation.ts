    // ARCHITECT: кастомная валидация форм без внешних зависимостей (Zod в проекте нет).
    // Чистые функции: возвращают текст ошибки или undefined, чтобы UI решал сам, где показать.

    export interface PasswordCheck {
    id: string;
    label: string;
    passed: boolean;
    }

    // Буквы (любой алфавит), пробел, дефис, апостроф; первая — буква
    const NAME_RE = /^[\p{L}][\p{L}\s'-]*$/u;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    export function validateName(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return "Укажи имя";
    if (trimmed.length < 2) return "Слишком коротко — минимум 2 символа";
    if (trimmed.length > 40) return "Слишком длинно — максимум 40 символов";
    if (!NAME_RE.test(trimmed)) return "Имя может содержать буквы, пробел, дефис и апостроф";
    return undefined;
    }

    export function validateEmail(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return "Укажи почту";
    if (!EMAIL_RE.test(trimmed)) return "Похоже на опечатку. Формат: name@mail.com";
    return undefined;
    }

    export function getPasswordChecks(password: string): PasswordCheck[] {
    return [
        { id: "length", label: "минимум 8 символов", passed: password.length >= 8 },
        { id: "upper", label: "заглавная буква", passed: /\p{Lu}/u.test(password) },
        { id: "lower", label: "строчная буква", passed: /\p{Ll}/u.test(password) },
        { id: "digit", label: "цифра", passed: /\d/.test(password) },
    ];
    }

    export function validatePassword(value: string): string | undefined {
    if (!value) return "Укажи пароль";
    const failed = getPasswordChecks(value).find((check) => !check.passed);
    if (!failed) return undefined;
    return `Не хватает: ${failed.label}`;
    }