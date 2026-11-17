// ARCHITECT: мок-аутентификация. Реальный провайдер (Supabase Auth) подключается только здесь:
// форма и store не знают, откуда пришёл пользователь. Пароль не сохраняется и не логируется —
// он приходит аргументом и не покидает эту функцию.

import { resolveRole, type UserRole } from "@/lib/admin";
import i18n from "@/lib/i18n";
import { ApiError } from "@/api/client";
import { delayMock } from "@/api/mockDelay";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    // ARCHITECT: роль считает resolveRole по email — мок повторяет контракт будущего бэкенда, где
    // роль приходит от сервера, а не назначается на клиенте.
    role: UserRole;
    // ARCHITECT: статус подтверждения почты — часть пользователя, как в реальном бэкенде. В моке
    // семантика та же: свежая регистрация не подтверждена, а вход и OAuth означают, что адрес уже
    // проверен (для входа нужен доступ к почте либо доверенный провайдер).
    emailVerified: boolean;
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
    if (!words) return i18n.t("profile.fallbackName", { ns: "common" });
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function createUser(name: string, email: string, emailVerified: boolean): AuthUser {
    return { id: `user_${crypto.randomUUID()}`, name, email, role: resolveRole(email), emailVerified };
}

export function signIn(email: string, password: string): Promise<AuthUser> {
    // ARCHITECT: пароль принимается по контракту формы, но в моке не участвует.
    void password;
    // ARCHITECT: существующий аккаунт считается подтверждённым — иначе вход вёл бы на экран
    // подтверждения почты, то есть гейт срабатывал бы дважды.
    return resolveAfterDelay(createUser(nameFromEmail(email), email, true));
}

export function signUp(name: string, email: string, password: string): Promise<AuthUser> {
    void password;
    // ARCHITECT: свежая регистрация не подтверждена: письмо ещё не открыто.
    return resolveAfterDelay(createUser(name.trim(), email, false));
}

export function signInWithGoogle(): Promise<AuthUser> {
    // ARCHITECT: фиктивный профиль: реальный ответ придёт от Google через бэкенд.
    // ARCHITECT: OAuth-провайдер уже верифицировал почту — подтверждать нечего.
    return resolveAfterDelay(createUser("Алекс", "alex@gmail.com", true));
}

// ARCHITECT: точки замены на Supabase (resetPasswordForEmail / updateUser / verifyOtp) — только этот
// модуль; store и страницы при подключении бэкенда не меняются. Пароль приходит аргументом и не
// сохраняется нигде: ни в store, ни в localStorage, ни в логах.
export type ResetTokenStatus = "valid" | "expired" | "invalid";
export type VerifyEmailResult = "verified" | "expired" | "invalid";

// ARCHITECT: конвенция мок-токенов одна на сброс и подтверждение — детерминированность нужна, чтобы
// цепочку можно было пройти руками без писем (DevMockHint подставляет ровно эти значения).
const VALID_TOKEN = "mock-valid";
const EXPIRED_TOKEN = "mock-expired";

function resolveToken(token: string): ResetTokenStatus {
    if (token === VALID_TOKEN) return "valid";
    if (token === EXPIRED_TOKEN) return "expired";
    return "invalid";
}

// ARCHITECT: запрос сброса отвечает нейтрально и всегда: по ответу нельзя узнать, существует ли
// аккаунт (anti-enumeration). Реальное письмо отправит бэкенд, клиент о результате не знает.
export function requestPasswordReset(email: string): Promise<void> {
    void email;
    return delayMock();
}

export function checkResetToken(token: string): Promise<ResetTokenStatus> {
    return delayMock().then(() => resolveToken(token));
}

// ARCHITECT: сброс проверяет токен ещё раз, а не доверяет состоянию из адресной строки: пока страница
// была открыта, ссылка могла истечь. Ответ — ApiError: вызывающий ловит один тип ошибок (api/client).
export function resetPassword(token: string, newPassword: string): Promise<void> {
    void newPassword;
    return delayMock().then(() => {
        const status = resolveToken(token);
        if (status === "expired") {
            throw new ApiError(410, i18n.t("errors.api.linkExpired", { ns: "common" }));
        }
        if (status === "invalid") {
            throw new ApiError(400, i18n.t("errors.api.linkInvalid", { ns: "common" }));
        }
    });
}

export function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
    return delayMock().then(() => {
        const status = resolveToken(token);
        return status === "valid" ? "verified" : status;
    });
}

// ARCHITECT: повторная отправка тоже нейтральна: «письмо отправлено» независимо от того, есть ли
// такой аккаунт — иначе форма превратилась бы в проверку существования пользователя.
export function resendVerificationEmail(email: string): Promise<void> {
    void email;
    return delayMock();
}
