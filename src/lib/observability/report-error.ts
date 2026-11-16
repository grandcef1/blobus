// ARCHITECT: отчёт об ошибке на НАШ сервер — функциональная необходимость (безопасность и
// работоспособность): он работает и без согласия на аналитику и сторонних сервисов не касается.
// ARCHITECT: USE_MOCKS — про источник данных, не про канал ошибок. Прежняя связка лишала нас
// видимости ошибок пользователей, отказавшихся от cookies: канал задаёт VITE_ERROR_LOG_ENDPOINT.
// ARCHITECT: без него мы ослепнем при отказе от аналитики; правовое основание — обеспечение
// работы сервиса.
// ARCHITECT: санитизация стоит здесь, а не на сервере: в отчёт не должны попасть почта, токены из
// адресной строки, заголовки авторизации и введённый пользователем текст — ни при отправке, ни в
// событиях Sentry (Observability берёт те же функции).
// ARCHITECT: отправка идёт через apiClient, поэтому ошибка самого запроса вернулась бы в logError и
// породила новый отчёт. От цикла защищают флаг отправки (его читает api/client.ts) и дедупликация.

import { apiClient } from "@/api/client";
import { ERROR_LOG_ENDPOINT } from "@/lib/env";

export interface ErrorReport {
    message: string;
    stack?: string;
    componentStack?: string;
    route: string;
    severity: "error" | "warning";
    timestamp: string;
}

export interface ErrorReportInput {
    severity: ErrorReport["severity"];
    /** Источник ошибки: Error, Event, строка или что угодно из промиса. */
    error?: unknown;
    /** Текст, когда ошибки нет вовсе — например, упавший чанк. */
    message?: string;
    componentStack?: string;
}

const MAX_REPORTS_PER_SESSION = 10;

const BEARER_PATTERN = /(bearer\s+)[\w.-]+/gi;
const SECRET_PATTERN =
    /((?:password|passwd|pwd|token|access_token|refresh_token|authorization|api[_-]?key)["']?\s*[:=]\s*["']?)([^\s,;"'&}]+)/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/** Вырезает почту и значения секретов из строки. */
export function sanitizeText(value: string): string {
    return value
        .replace(BEARER_PATTERN, "$1[redacted]")
        .replace(SECRET_PATTERN, "$1[redacted]")
        .replace(EMAIL_PATTERN, "[redacted]");
}

/** Убирает query и hash: там бывают токены сброса пароля и подтверждения почты. */
export function sanitizeUrl(value: string): string {
    const cut = value.search(/[?#]/);
    return cut === -1 ? value : value.slice(0, cut);
}

let sentCount = 0;
let reportingInFlight = false;
let sentryTransport: ((error: unknown) => void) | null = null;
const sentKeys = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
    for (const listener of listeners) listener();
}

/** Подписка для DEV-панели: счётчик и состояние Sentry меняются вне React. */
export function subscribeObservability(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getSentReportCount(): number {
    return sentCount;
}

export function isSentryActive(): boolean {
    return sentryTransport !== null;
}

/** Транспорт ставит Observability после динамического импорта SDK; null — SDK закрыт. */
export function setSentryTransport(transport: ((error: unknown) => void) | null): void {
    sentryTransport = transport;
    notify();
}

/** Читает api/client.ts: пока идёт отправка отчёта, новые отчёты не создаются. */
export function isReportingInFlight(): boolean {
    return reportingInFlight;
}

function normalizeError(value: unknown): { message: string; stack?: string } {
    if (value instanceof Error) return { message: value.message, stack: value.stack };
    if (typeof value === "string") return { message: value };
    if (typeof value === "object" && value !== null) {
        const candidate = value as { message?: unknown };
        if (typeof candidate.message === "string") return { message: candidate.message };
    }
    return { message: "Unknown error" };
}

/**
 * Отправляет один нормализованный и очищенный отчёт. Повтор той же ошибки и лимит на сессию
 * отбрасываются; функция не бросает исключений никогда.
 */
export function reportError(input: ErrorReportInput): void {
    try {
        const normalized = normalizeError(input.error);
        const message = sanitizeText(input.message ?? normalized.message);
        const stack = normalized.stack === undefined ? undefined : sanitizeText(normalized.stack);
        const key = `${message}|${stack ?? ""}`;

        if (sentKeys.has(key) || sentCount >= MAX_REPORTS_PER_SESSION) return;
        sentKeys.add(key);
        sentCount += 1;
        notify();

        const report: ErrorReport = {
            message,
            stack,
            // componentStack — трассировка React-компонентов, пользовательского текста в ней нет.
            componentStack:
                input.componentStack === undefined ? undefined : sanitizeText(input.componentStack),
            route: sanitizeUrl(window.location.pathname),
            severity: input.severity,
            timestamp: new Date().toISOString(),
        };

        // ARCHITECT: канал отчётов не зависит от моков: локально — консоль, в проде — адрес из
        // VITE_ERROR_LOG_ENDPOINT (пусто = бэкенда ещё нет, first-party молчит). Падение этого же
        // запроса проходит через api/client.ts, где флаг reportingInFlight отсекает рекурсию.
        if (import.meta.env.DEV) {
            console.error("[observability]", report);
        } else if (ERROR_LOG_ENDPOINT !== "") {
            reportingInFlight = true;
            void apiClient
                .post(ERROR_LOG_ENDPOINT, report)
                .catch(() => undefined)
                .finally(() => {
                    reportingInFlight = false;
                });
        }

        if (sentryTransport !== null) sentryTransport(input.error ?? message);
    } catch {
        // ARCHITECT: отчёт об ошибке не имеет права упасть сам.
    }
}
