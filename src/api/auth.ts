// ARCHITECT: мок-аутентификация. Реальный провайдер (Supabase Auth) подключается только здесь:
// форма и store не знают, откуда пришёл пользователь. Пароль не сохраняется и не логируется —
// он приходит аргументом и не покидает эту функцию.

import { resolveRole, type UserRole } from "@/lib/admin";
import i18n from "@/lib/i18n";
import { ApiError, apiFetch } from "@/api/client";
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

// ARCHITECT: отдельный флаг от VITE_USE_MOCKS: остальные модули остаются на моках, а вход идёт в реальный
// API. Дефолт — мок, поэтому сборка и тесты без .env ведут себя как раньше.
// ARCHITECT: VITE_AUTH_MODE ещё не объявлен в src/vite-env.d.ts (файл вне задачи), а index-сигнатуры у
// ImportMetaEnv нет: тип дочитывается одним явным сужением — без any и без чтения других ключей вслепую (§5.3).
const AUTH_ENV = import.meta.env as ImportMetaEnv & { readonly VITE_AUTH_MODE?: string };

/** true — парольный вход идёт в реальный /api/auth; false — моки (по умолчанию). */
export const USE_REAL_AUTH = AUTH_ENV.VITE_AUTH_MODE === "real";

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
    return {
        id: `user_${crypto.randomUUID()}`,
        name,
        email,
        role: resolveRole(email),
        emailVerified,
    };
}

/** Пользователь из серверного контракта: сервер отдаёт только id и адрес. */
interface SessionUser {
    readonly id: string;
    readonly email: string;
}

// ARCHITECT: имя выводится из адреса тем же правилом, что в моке: серверный контракт /api/auth его не
// хранит. Подтверждение почты в реальном режиме не запрашивается — сессию уже выдал сервер.
function toSessionAuthUser(user: SessionUser): AuthUser {
    return {
        id: user.id,
        name: nameFromEmail(user.email),
        email: user.email,
        role: resolveRole(user.email),
        emailVerified: true,
    };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
    if (!USE_REAL_AUTH) {
        // ARCHITECT: пароль принимается по контракту формы, но в моке не участвует.
        void password;
        // ARCHITECT: существующий аккаунт считается подтверждённым — иначе вход вёл бы на экран
        // подтверждения почты, то есть гейт срабатывал бы дважды.
        return resolveAfterDelay(createUser(nameFromEmail(email), email, true));
    }

    const { user } = await apiFetch<{ user: SessionUser }>("/auth/login", {
        method: "POST",
        body: { email, password },
    });

    return toSessionAuthUser(user);
}

export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
    if (!USE_REAL_AUTH) {
        void password;
        // ARCHITECT: свежая регистрация не подтверждена: письмо ещё не открыто.
        return resolveAfterDelay(createUser(name.trim(), email, false));
    }

    // ARCHITECT: сервер регистрацию не логинит — ответ неотличим для нового и занятого адреса
    // (анти-энумерация), поэтому сразу входим тем же паролем. Имя серверный контракт не принимает:
    // показывается имя из адреса, как в моке при обычном входе.
    void name;
    await apiFetch<{ status: string }>("/auth/signup", {
        method: "POST",
        body: { email, password },
    });

    return signIn(email, password);
}

export async function signInWithGoogle(): Promise<AuthUser> {
    if (USE_REAL_AUTH) {
        // ARCHITECT: OAuth на сервере не подключён, кнопка в реальном режиме не рендерится. Вызов всё
        // равно отвечает ошибкой того же формата (ApiError), а не фиктивным профилем: текст технический и
        // в интерфейс не попадает — новых ключей словаря задача не разрешает.
        throw new ApiError(501, "HTTP 501");
    }

    // ARCHITECT: фиктивный профиль: реальный ответ придёт от Google через бэкенд.
    // ARCHITECT: OAuth-провайдер уже верифицировал почту — подтверждать нечего.
    return resolveAfterDelay(createUser("Алекс", "alex@gmail.com", true));
}

/** Обновляет сессию по refresh-куке: сервер ротирует оба токена (server/routes/auth.ts). */
export async function refreshSession(): Promise<void> {
    if (!USE_REAL_AUTH) return;

    await apiFetch<{ status: string }>("/auth/refresh", { method: "POST" });
}

/**
 * Текущий пользователь по серверной куке. null — гость, истёкшая сессия или сбой сети: приложение при
 * старте не должно падать из-за недоступного API.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
    if (!USE_REAL_AUTH) return null;

    try {
        const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");

        return toSessionAuthUser(user);
    } catch (error) {
        // ARCHITECT: access-кука живёт час и на старте чаще истекла, чем отсутствует: одна попытка refresh
        // и повторный me, и только потом гость. Остальные сбои сразу означают гостя.
        if (!(error instanceof ApiError) || error.statusCode !== 401) return null;
    }

    try {
        await refreshSession();
        const { user } = await apiFetch<{ user: SessionUser }>("/auth/me");

        return toSessionAuthUser(user);
    } catch {
        return null;
    }
}

/** Завершает сессию на сервере: HttpOnly-куки снимает только сервер. */
export async function signOut(): Promise<void> {
    if (!USE_REAL_AUTH) return;

    await apiFetch<{ status: string }>("/auth/logout", { method: "POST" });
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
