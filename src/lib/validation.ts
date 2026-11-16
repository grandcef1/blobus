    // ARCHITECT: кастомная валидация форм без внешних зависимостей (Zod в проекте нет).
    // ARCHITECT: функции возвращают ключ словаря, а не текст: перевод делает компонент, поэтому модуль
    // обслуживает любой язык и остаётся чистым (без обращения к i18n внутри).

    export type PasswordCheckId = "length" | "upper" | "lower" | "digit";

    export type PasswordCheckKey = `checks.${PasswordCheckId}`;

    export type PasswordMissingKey = `errors.passwordMissing.${PasswordCheckId}`;

    export type ValidationKey =
    | "errors.nameRequired"
    | "errors.nameTooShort"
    | "errors.nameTooLong"
    | "errors.nameInvalid"
    | "errors.emailRequired"
    | "errors.emailFormat"
    | "errors.passwordRequired"
    | "errors.passwordConfirmRequired"
    | "errors.passwordMismatch"
    | PasswordMissingKey;

    export interface PasswordCheck {
    id: PasswordCheckId;
    labelKey: PasswordCheckKey;
    passed: boolean;
    }

    // Буквы (любой алфавит), пробел, дефис, апостроф; первая — буква
    const NAME_RE = /^[\p{L}][\p{L}\s'-]*$/u;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    export function validateName(value: string): ValidationKey | undefined {
    const trimmed = value.trim();
    if (!trimmed) return "errors.nameRequired";
    if (trimmed.length < 2) return "errors.nameTooShort";
    if (trimmed.length > 40) return "errors.nameTooLong";
    if (!NAME_RE.test(trimmed)) return "errors.nameInvalid";
    return undefined;
    }

    export function validateEmail(value: string): ValidationKey | undefined {
    const trimmed = value.trim();
    if (!trimmed) return "errors.emailRequired";
    if (!EMAIL_RE.test(trimmed)) return "errors.emailFormat";
    return undefined;
    }

    export function getPasswordChecks(password: string): PasswordCheck[] {
    return [
        { id: "length", labelKey: "checks.length", passed: password.length >= 8 },
        { id: "upper", labelKey: "checks.upper", passed: /\p{Lu}/u.test(password) },
        { id: "lower", labelKey: "checks.lower", passed: /\p{Ll}/u.test(password) },
        { id: "digit", labelKey: "checks.digit", passed: /\d/.test(password) },
    ];
    }

    export function validatePassword(value: string): ValidationKey | undefined {
    if (!value) return "errors.passwordRequired";
    const failed = getPasswordChecks(value).find((check) => !check.passed);
    if (!failed) return undefined;
    return `errors.passwordMissing.${failed.id}`;
    }

    // ARCHITECT: подтверждение проверяется отдельно от пароля: пустое поле и опечатка — разные
    // ошибки, и человеку нужно сказать, какая именно. Порядок аргументов «пароль, подтверждение»
    // повторяет порядок полей на экране.
    export function validatePasswordConfirm(password: string, confirm: string): ValidationKey | undefined {
    if (!confirm) return "errors.passwordConfirmRequired";
    if (confirm !== password) return "errors.passwordMismatch";
    return undefined;
    }