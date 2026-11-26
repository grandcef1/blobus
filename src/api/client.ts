// ARCHITECT: единая HTTP-точка входа для будущего бэкенда. Нативный fetch вместо axios:
// бандл не раздувается, а весь транспорт (токен, таймаут, разбор ошибок) концентрируется здесь —
// ни один модуль api/* не дёргает fetch напрямую.

import { useAuthStore } from "@/store/auth";
// ARCHITECT: перевод резолвится синглтоном в момент вызова: хук в api-слое недоступен (это не
// компонент), а модульная константа зафиксировала бы язык навсегда.
import i18n from "@/lib/i18n";
// ARCHITECT: циклический импорт client ↔ observability безопасен: обе стороны обращаются к функциям
// друг друга только в момент запроса, а не при загрузке модуля.
import { isReportingInFlight, reportError } from "@/lib/observability/report-error";

export interface ApiErrorShape {
    statusCode: number;
    message: string;
}

export type ApiData = Record<string, unknown> | unknown[] | null;

/** Необязательные поля конверта ошибки: оба приходят от сервера и нужны для логов и i18n-адаптера. */
export interface ApiErrorDetails {
    readonly code?: string;
    readonly requestId?: string;
}

export interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    /** Тело запроса: сериализуется в JSON автоматически. */
    body?: unknown;
    /** Дополнительные заголовки поверх стандартных. */
    headers?: HeadersInit;
    /** Внешняя отмена (например, unmount запросчика). Отменяет и внутренний таймаут. */
    signal?: AbortSignal;
    timeoutMs?: number;
}

export class ApiError extends Error {
    readonly statusCode: number;
    /** Код из серверного конверта (server/http.ts): фронтенд мапит его в i18n. */
    readonly code: string | undefined;
    /** Идентификатор запроса на сервере: по нему лог сопоставляется с ответом. */
    readonly requestId: string | undefined;

    constructor(statusCode: number, message: string, details: ApiErrorDetails = {}) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = details.code;
        this.requestId = details.requestId;
    }
}

// ARCHITECT: base URL живёт в переменных окружения: один источник правды для dev/staging/prod.
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api";
const DEFAULT_TIMEOUT_MS = 15_000;

// ARCHITECT: токен пока не выпускается (mock-авторизация), поэтому функция возвращает
// undefined и Bearer-заголовок просто не добавится. Когда реальный токен появится в
// auth-store или безопасном хранилище — правка ограничится этой функцией.
function getAuthToken(): string | undefined {
    // useAuthStore — единственное место, где живёт состояние пользователя: отсюда позже
    // придёт access token, и клиент не нужно будет переподключать.
    void useAuthStore;
    return undefined;
}

// ARCHITECT: ошибки логируются только в dev-сборке: в проде журнал консоли — это утечка
// внутренних данных и шум для пользователя. Вместо консоли прод отправляет отчёт на наш сервер.
function logError(error: unknown): void {
    if (import.meta.env.DEV) {
        console.error("[api]", error);
        return;
    }
    // ARCHITECT: отправка самого отчёта идёт через этот же клиент, поэтому без проверки флага её
    // падение породило бы новый отчёт — бесконечный цикл.
    if (!isReportingInFlight()) reportError({ severity: "error", error });
}

/**
 * Выполняет запрос к API Blobus и возвращает разобранный JSON.
 * Любая не-2xx проверка превращается в ApiError — вызывающий ловит один тип ошибок.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    // ARCHITECT: внешний signal и внутренний таймаут объединяются вручную: AbortSignal.any
    // ещё не гарантирован во всех целевых браузерах проекта.
    const onExternalAbort = () => controller.abort();
    if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const token = getAuthToken();

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
        });

        if (!response.ok) {
            // ARCHITECT: сначала пробуем штатный контракт ApiErrorShape; если бэкенд вернул
            // что-то другое (текст, HTML прокси) — деградируем до статуса и текста ответа.
            let message = response.statusText || `HTTP ${response.status}`;
            try {
                const payload: unknown = await response.json();
                if (
                    typeof payload === "object" &&
                    payload !== null &&
                    typeof (payload as ApiErrorShape).message === "string"
                ) {
                    message = (payload as ApiErrorShape).message;
                }
            } catch {
                const text = await response.text().catch(() => "");
                if (text) message = text.slice(0, 200);
            }
            throw new ApiError(response.status, message);
        }

        if (response.status === 204) {
            return null as T;
        }

        const data: unknown = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            logError(error);
            throw error;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
            const timeoutError = new ApiError(0, i18n.t("errors.api.timeout", { ns: "common" }));
            logError(timeoutError);
            throw timeoutError;
        }
        // ARCHITECT: сетевой сбой fetch выбрасывает TypeError без кода статуса: приводим его
        // к тому же ApiError, чтобы верхним слоям не приходилось различать два типа неудач.
        const networkError = new ApiError(0, i18n.t("errors.api.offline", { ns: "common" }));
        logError(error);
        throw networkError;
    } finally {
        window.clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onExternalAbort);
    }
}

export const apiClient = {
    get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(path, { ...options, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(path, { ...options, method: "PATCH", body }),
    put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
        request<T>(path, { ...options, method: "DELETE" }),
};

// ARCHITECT: отдельный транспорт реального auth-API: сессия живёт в HttpOnly-куках, поэтому запрос идёт с
// credentials include, а мутации — с double-submit CSRF-токеном из не-HttpOnly куки (server/csrf.ts).
// request() выше не меняется: его потребители работают с моками и о куках не знают.
const CSRF_COOKIE_NAME = "blobus_csrf_token";
const CSRF_PATH = "/auth/csrf";
const AUTH_PATH_PREFIX = "/auth/";
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export interface ApiFetchOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /** Тело запроса: сериализуется в JSON автоматически. */
    body?: unknown;
    signal?: AbortSignal;
}

/** Конверт серверной ошибки: code мапится в i18n, message — безопасный общий текст (server/http.ts). */
interface ServerErrorEnvelope {
    error?: {
        code?: unknown;
        message?: unknown;
        requestId?: unknown;
    };
}

/** Значение не-HttpOnly куки: document.cookie — единственный доступный источник, библиотека не нужна. */
function readDocumentCookie(name: string): string | undefined {
    const prefix = `${name}=`;

    for (const part of document.cookie.split(";")) {
        const entry = part.trim();
        if (entry.startsWith(prefix)) return decodeURIComponent(entry.slice(prefix.length));
    }

    return undefined;
}

// ARCHITECT: токен читается из куки на каждую мутацию, а не кэшируется: логин и выход ротируют CSRF, и
// кэш разошёлся бы с браузером после первого же входа. GET нужен только когда куки ещё нет.
async function readCsrfToken(): Promise<string> {
    const existing = readDocumentCookie(CSRF_COOKIE_NAME);
    if (existing !== undefined) return existing;

    await fetch(`${API_BASE_URL}${CSRF_PATH}`, { credentials: "include" });

    return readDocumentCookie(CSRF_COOKIE_NAME) ?? "";
}

function toEnvelopeError(status: number, payload: unknown): ApiError {
    const envelope = (
        typeof payload === "object" && payload !== null ? payload : {}
    ) as ServerErrorEnvelope;
    const code = typeof envelope.error?.code === "string" ? envelope.error.code : undefined;
    const requestId =
        typeof envelope.error?.requestId === "string" ? envelope.error.requestId : undefined;
    // ARCHITECT: без текста в конверте остаётся только статус: generic-ключ потребовал бы новой строки
    // словаря, а их добавление вне задачи.
    const message =
        typeof envelope.error?.message === "string" ? envelope.error.message : `HTTP ${status}`;

    return new ApiError(status, message, { code, requestId });
}

/** Один запрос без повторов: fetch → разбор конверта → ApiError или данные. */
async function sendApiRequest<T>(path: string, options: ApiFetchOptions): Promise<T> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (MUTATING_METHODS.includes(method)) headers["x-csrf-token"] = await readCsrfToken();

    let response: Response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            credentials: "include",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: options.signal,
        });
    } catch (error) {
        // ARCHITECT: отмена и сетевой сбой приводятся к тому же ApiError, что и в request(): верхние слои
        // различают только статус, а тексты берутся из существующих ключей словаря.
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ApiError(0, i18n.t("errors.api.timeout", { ns: "common" }));
        }

        throw new ApiError(0, i18n.t("errors.api.offline", { ns: "common" }));
    }

    if (response.status === 204) return null as T;

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) throw toEnvelopeError(response.status, payload);

    return payload as T;
}

/**
 * Запрос к реальному API с cookie-сессией и CSRF. На 401 у не-auth путей — одна попытка refresh и один
 * повтор: истёкший access-токен не должен выглядеть как «выкинуло из аккаунта».
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    try {
        return await sendApiRequest<T>(path, options);
    } catch (error) {
        // ARCHITECT: auth-пути не обновляются: refresh → 401 → refresh зациклился бы, а login обязан
        // показать свою ошибку как есть.
        const expired =
            error instanceof ApiError &&
            error.statusCode === 401 &&
            !path.startsWith(AUTH_PATH_PREFIX);

        if (!expired) {
            logError(error);
            throw error;
        }

        try {
            await sendApiRequest("/auth/refresh", { method: "POST" });

            return await sendApiRequest<T>(path, options);
        } catch (retryError) {
            logError(retryError);
            throw retryError;
        }
    }
}

export interface ApiStreamOptions {
    method?: "GET" | "POST";
    /** Тело запроса: сериализуется в JSON автоматически. */
    body?: unknown;
    /** Отмена вызова: обрыв соединения или уход со страницы. */
    signal?: AbortSignal;
}

// ARCHITECT: потоковый транспорт (SSE чата): та же cookie-сессия, тот же CSRF-заголовок и тот же конверт
// ошибок, что у apiFetch, но тело ответа не разбирается — поток читает вызывающий. Переиграть поток после
// первого кадра нельзя, поэтому 401 обновляется один раз до его старта: повтор уходит целиком и только пока
// ответ не получен; после старта ошибка уходит событием error (см. api/chat.ts).
export async function apiStream(path: string, options: ApiStreamOptions = {}): Promise<Response> {
    try {
        return await sendApiStream(path, options);
    } catch (error) {
        // ARCHITECT: auth-пути не обновляются: refresh → 401 → refresh зациклился бы (как в apiFetch).
        const expired =
            error instanceof ApiError &&
            error.statusCode === 401 &&
            !path.startsWith(AUTH_PATH_PREFIX);

        if (!expired) {
            logError(error);
            throw error;
        }

        try {
            await sendApiRequest("/auth/refresh", { method: "POST" });

            return await sendApiStream(path, options);
        } catch (retryError) {
            logError(retryError);
            throw retryError;
        }
    }
}

/** Один потоковый запрос без повторов: fetch → разбор конверта ошибки → поток для вызывающего. */
async function sendApiStream(path: string, options: ApiStreamOptions): Promise<Response> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        // ARCHITECT: сервер отвечает text/event-stream; Accept фиксирует ожидание до первого кадра.
        Accept: "text/event-stream",
    };

    if (MUTATING_METHODS.includes(method)) headers["x-csrf-token"] = await readCsrfToken();

    let response: Response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            credentials: "include",
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: options.signal,
        });
    } catch (error) {
        // ARCHITECT: отмена до старта потока приводится к тому же ApiError, что и в apiFetch: верхние слои
        // различают только статус, а тексты берутся из существующих ключей словаря.
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ApiError(0, i18n.t("errors.api.timeout", { ns: "common" }));
        }

        throw new ApiError(0, i18n.t("errors.api.offline", { ns: "common" }));
    }

    if (!response.ok)
        throw toEnvelopeError(response.status, await response.json().catch(() => null));

    if (response.body === null)
        throw new ApiError(0, i18n.t("errors.api.offline", { ns: "common" }));

    return response;
}
