// ARCHITECT: единая HTTP-точка входа для будущего бэкенда. Нативный fetch вместо axios:
// бандл не раздувается, а весь транспорт (токен, таймаут, разбор ошибок) концентрируется здесь —
// ни один модуль api/* не дёргает fetch напрямую.

import { useAuthStore } from "@/store/auth";

export interface ApiErrorShape {
    statusCode: number;
    message: string;
}

export type ApiData = Record<string, unknown> | unknown[] | null;

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

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
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
// внутренних данных и шум для пользователя.
function logError(error: unknown): void {
    if (import.meta.env.DEV) {
        console.error("[api]", error);
    }
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
            const timeoutError = new ApiError(0, "Превышено время ожидания ответа сервера");
            logError(timeoutError);
            throw timeoutError;
        }
        // ARCHITECT: сетевой сбой fetch выбрасывает TypeError без кода статуса: приводим его
        // к тому же ApiError, чтобы верхним слоям не приходилось различать два типа неудач.
        const networkError = new ApiError(0, "Нет соединения с сервером");
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