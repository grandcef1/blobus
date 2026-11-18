// ARCHITECT: единый конверт ошибок для всех серверных модулей, чтобы формат не расползся по файлам;
// коды мапит фронтенд-адаптер в i18n, а message — безопасный общий текст, не для прямого показа.
import type { Response } from "express";

export type ErrorCode =
    "NOT_FOUND" | "BAD_REQUEST" | "PAYLOAD_TOO_LARGE" | "RATE_LIMITED" | "FORBIDDEN" | "INTERNAL";

export interface ErrorEnvelope {
    readonly error: {
        readonly code: ErrorCode;
        readonly message: string;
        readonly requestId: string;
    };
}

// ARCHITECT: сообщение — безопасный общий текст на английском, не для прямого показа пользователю:
// фронтенд-адаптер в Ф3 мапит code в i18n, поэтому внутренние детали в тело ошибки не попадают.
const ERROR_MESSAGES: Record<ErrorCode, string> = {
    NOT_FOUND: "Resource not found",
    BAD_REQUEST: "Request could not be processed",
    PAYLOAD_TOO_LARGE: "Request payload is too large",
    RATE_LIMITED: "Too many requests",
    FORBIDDEN: "Request forbidden",
    INTERNAL: "Internal server error",
};

// ARCHITECT: requestId читается из заголовка ответа, а не из res.locals: заголовок уже выставлен
// middleware, поэтому конверт одинаков у 404-fallback и у обработчика ошибок.
export function errorEnvelope(code: ErrorCode, res: Response): ErrorEnvelope {
    return {
        error: {
            code,
            message: ERROR_MESSAGES[code],
            requestId: String(res.getHeader("x-request-id") ?? ""),
        },
    };
}
