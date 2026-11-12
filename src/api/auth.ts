// ARCHITECT: мок-аутентификация. Реальный провайдер (Supabase Auth) подключается только здесь:
// форма и store не знают, откуда пришёл пользователь. Пароль не сохраняется и не логируется —
// он приходит аргументом и не покидает эту функцию.

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

const NETWORK_DELAY_MS = 400;

function resolveAfterDelay(user: AuthUser): Promise<AuthUser> {
    return new Promise((resolve) => {
        window.setTimeout(() => resolve(user), NETWORK_DELAY_MS);
    });
}

// ARCHITECT: имя из локальной части адреса — заглушка для входа без регистрации в этой сессии.
function nameFromEmail(email: string): string {
    const localPart = email.split("@")[0] ?? "";
    const words = localPart.replace(/[._-]+/g, " ").trim();
    if (!words) return "Ученик";
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function createUser(name: string, email: string): AuthUser {
    return { id: `user_${crypto.randomUUID()}`, name, email };
}

export function signIn(email: string, password: string): Promise<AuthUser> {
    // ARCHITECT: пароль принимается по контракту формы, но в моке не участвует.
    void password;
    return resolveAfterDelay(createUser(nameFromEmail(email), email));
}

export function signUp(name: string, email: string, password: string): Promise<AuthUser> {
    void password;
    return resolveAfterDelay(createUser(name.trim(), email));
}

export function signInWithGoogle(): Promise<AuthUser> {
    // ARCHITECT: фиктивный профиль: реальный ответ придёт от Google через бэкенд.
    return resolveAfterDelay(createUser("Алекс", "alex@gmail.com"));
}
