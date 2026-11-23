// ARCHITECT: мок-аутентификация. Реальный провайдер (Supabase Auth) подключается только здесь:
// форма и store не знают, откуда пришёл пользователь. Пароль не сохраняется и не логируется —
// он приходит аргументом и не покидает эту функцию.

import { resolveRole, type UserRole } from "@/lib/admin";
import i18n from "@/lib/i18n";
import { ApiError, apiFetch } from "@/api/client";
import { delayMock } from "@/api/mockDelay";
import { toast } from "@/store/toast";
// ARCHITECT: только тип: сам supabase-js грузится динамическим импортом в PKCE-ветке, чтобы не попадать в
// начальный граф бандла (бюджет initial load — scripts/check-bundle.mjs).
import type { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";

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
// ARCHITECT: VITE_AUTH_MODE, VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY ещё не объявлены в
// src/vite-env.d.ts (файл вне задачи), а index-сигнатуры у ImportMetaEnv нет: типы дочитываются одним
// явным сужением — без any и без чтения других ключей вслепую (§5.3).
const AUTH_ENV = import.meta.env as ImportMetaEnv & {
    readonly VITE_AUTH_MODE?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

/** true — парольный вход идёт в реальный /api/auth; false — моки (по умолчанию). */
export const USE_REAL_AUTH = AUTH_ENV.VITE_AUTH_MODE === "real";

// ARCHITECT: для PKCE-танца нужны только публичные значения — URL проекта и publishable-ключ. Секретный ключ
// Supabase сюда попадать не должен никогда (§16.3): в клиентском коде живёт ровно один ключ — публикуемый, и
// проверять это на рантайме нечем (значения не логируются и в текст ошибок не попадают).
const SUPABASE_URL = AUTH_ENV.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = AUTH_ENV.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

/** true — Google-вход настроен: реальный режим и оба публичных значения заданы. */
export const GOOGLE_READY = USE_REAL_AUTH && SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";

// ARCHITECT: адрес возврата после провайдера: страница входа приложения, а не корень — пользователь видит
// знакомый экран, а гидратация стора уже поднимет сессию из серверной куки.
const OAUTH_REDIRECT_PATH = "/login";

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

// ARCHITECT: настройки браузерного PKCE-клиента вынесены в константу, чтобы тест (auth.test.ts) читал их как
// данные — без моков окружения и без инициализации supabase-js. persistSession:true нужен, чтобы
// code-verifier пережил редирект к провайдеру: при false auth-js держит его в хранилище памяти страницы
// (memoryLocalStorageAdapter) и теряет при уходе на Google, а обмен code тогда не находит verifier.
// Сессия в браузере всё равно не остаётся: clearBrowserAuthStorage удаляет sb-*-ключи сразу после успешного
// серверного обмена (/auth/oauth/exchange), а detectSessionInUrl:false не даёт клиенту читать токены из
// адреса — источник правды остаётся серверная HttpOnly-кука (§16.4).
export const BROWSER_AUTH_OPTIONS: NonNullable<SupabaseClientOptions<"public">["auth"]> = {
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: false,
};

// ARCHITECT: браузерный клиент нужен только для PKCE-танца, поэтому создаётся лениво и динамическим
// импортом: supabase-js не попадает в начальный граф бандла. Хранит он ровно verifier до конца обмена и не
// подхватывает сессию из адреса: sb-ключи чистятся сразу после успешного обмена — источник правды остаётся
// серверная HttpOnly-кука (§16.4).
let browserClient: SupabaseClient | undefined;

async function createBrowserClient(): Promise<SupabaseClient> {
    if (browserClient === undefined) {
        const { createClient } = await import("@supabase/supabase-js");

        browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: BROWSER_AUTH_OPTIONS,
        });
    }

    return browserClient;
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
    if (!USE_REAL_AUTH) {
        // ARCHITECT: фиктивный профиль: реальный ответ придёт от Google через бэкенд.
        // ARCHITECT: OAuth-провайдер уже верифицировал почту — подтверждать нечего.
        return resolveAfterDelay(createUser("Алекс", "alex@gmail.com", true));
    }

    // ARCHITECT: без публичных значений Supabase Google-вход не настроен, и кнопка в форме скрыта. Вызов
    // отвечает ошибкой того же формата (ApiError), что и сетевые: текст технический, в интерфейс не
    // попадает, новых ключей словаря не требуется.
    if (!GOOGLE_READY) throw new ApiError(501, "HTTP 501");

    const client = await createBrowserClient();
    const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${OAUTH_REDIRECT_PATH}` },
    });

    if (error !== null) throw new ApiError(501, "HTTP 501");

    // ARCHITECT: при успехе браузер уходит на провайдера, поэтому промис не завершается: форма не успевает
    // показать ложную ошибку, пока идёт редирект, а кнопка остаётся в состоянии загрузки.
    return new Promise<AuthUser>(() => undefined);
}

/**
 * Завершает PKCE-танец Google: одноразовый code из адреса меняется на серверные HttpOnly-куки. null —
 * редиректа не было или обмен не удался: приложение остаётся гостем и не падает.
 */
export async function handleOAuthRedirect(): Promise<AuthUser | null> {
    if (!GOOGLE_READY) return null;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    // ARCHITECT: отказ провайдера (например access_denied) приходит параметром адреса, а не исключением,
    // поэтому пользователь должен увидеть причину, а параметры ошибки не остаются в истории.
    if (searchParams.get("error") !== null) {
        toast.error(i18n.t("errors.googleFailed", { ns: "auth" }));
        removeOAuthParamsFromUrl();
        return null;
    }

    if (code === null) return null;

    try {
        const client = await createBrowserClient();
        const { data, error } = await client.auth.exchangeCodeForSession(code);

        if (error !== null || data.session === null) {
            // ARCHITECT: exchangeCodeForSession отдаёт отказ объектом, а не исключением, поэтому он минует catch.
            console.warn("auth: oauth exchange failed", {
                status: error?.status ?? 0,
                code: error?.code,
            });
            toast.error(i18n.t("errors.googleFailed", { ns: "auth" }));
            return null;
        }

        const { user } = await apiFetch<{ user: SessionUser }>("/auth/oauth/exchange", {
            method: "POST",
            body: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            },
        });

        // ARCHITECT: серверные куки уже стоят, поэтому локальную сессию supabase-js чистим только в браузере:
        // серверный выход отозвал бы ровно ту сессию, которую мы только что завели (§16.4).
        clearBrowserAuthStorage();

        return toSessionAuthUser(user);
    } catch (error) {
        // ARCHITECT: без тоста отказ обмена выглядел как «ничего не произошло»: гость оставался гостем.
        const apiError = error instanceof ApiError ? error : null;
        console.warn("auth: oauth exchange failed", {
            status: apiError?.statusCode ?? 0,
            code: apiError?.code,
            requestId: apiError?.requestId,
        });
        toast.error(i18n.t("errors.googleFailed", { ns: "auth" }));
        return null;
    } finally {
        // ARCHITECT: одноразовый code не остаётся в адресной строке и истории — ни при успехе, ни при
        // ошибке: коды и токены в URL не живут дольше обмена (§16.11).
        removeOAuthParamsFromUrl();
    }
}

/** Убирает из адреса параметры обмена и отказа провайдера, сохраняя путь и hash приложения. */
function removeOAuthParamsFromUrl(): void {
    const url = new URL(window.location.href);

    url.searchParams.delete("code");
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

// ARCHITECT: источник правды — серверная HttpOnly-кука; браузерная сессия supabase нам не нужна, но удалять
// её нужно локально, потому что серверный выход отзывает сессию и убивает уже подтверждённый вход.
function clearBrowserAuthStorage(): void {
    try {
        // ARCHITECT: ключ по умолчанию у supabase-js — "sb-" + первый сегмент hostname + "-auth-token";
        // рядом с ним лежат производные ключи verifier и пользователя.
        const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

        for (const key of [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`]) {
            window.localStorage.removeItem(key);
        }
    } catch {
        // ARCHITECT: сбой очистки гасится молча — вход уже подтверждён серверной кукой.
    }
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
