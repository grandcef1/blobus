// ARCHITECT: приложение собирается функцией, а не модулем-одиночкой: тесты поднимают его на случайном
// порту, а точка входа server/index.ts — на порту из окружения.
import { randomUUID } from "node:crypto";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";

type ErrorCode = "NOT_FOUND" | "BAD_REQUEST" | "PAYLOAD_TOO_LARGE" | "INTERNAL";

interface ErrorEnvelope {
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
    INTERNAL: "Internal server error",
};

const SERVICE_NAME = "blobus-api";

/** Числовой статус ошибки в диапазоне 400–599; всё остальное — 500. */
function resolveStatus(error: unknown): number {
    if (typeof error === "object" && error !== null) {
        const candidate = error as { status?: unknown; statusCode?: unknown };
        const status = typeof candidate.status === "number" ? candidate.status : candidate.statusCode;

        if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599) {
            return status;
        }
    }

    return 500;
}

function resolveCode(status: number): ErrorCode {
    if (status === 413) return "PAYLOAD_TOO_LARGE";
    if (status >= 400 && status < 500) return "BAD_REQUEST";

    return "INTERNAL";
}

// ARCHITECT: requestId выставляется на каждом ответе, включая ошибки: по нему лог сервера сопоставляется
// с ответом, который увидел клиент.
function attachRequestId(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader("x-request-id", randomUUID());
    next();
}

// ARCHITECT: requestId читается из заголовка ответа, а не из res.locals: заголовок уже выставлен
// middleware, поэтому конверт одинаков у 404-fallback и у обработчика ошибок.
function errorEnvelope(code: ErrorCode, res: Response): ErrorEnvelope {
    return {
        error: {
            code,
            message: ERROR_MESSAGES[code],
            requestId: String(res.getHeader("x-request-id") ?? ""),
        },
    };
}

export function buildApp(registerRoutes?: (app: Express) => void): Express {
    const app = express();

    app.disable("x-powered-by");
    // ARCHITECT: дефолтов helmet достаточно для JSON-API; CSP для SPA живёт в vercel.json, потому что
    // разметку отдаёт статика, а не этот сервер.
    app.use(helmet());
    app.use(attachRequestId);
    // ARCHITECT: лимит тела стоит до парсинга — body-parser отклонит слишком большой запрос, не разбирая JSON.
    app.use(express.json({ limit: "16kb" }));

    // Health отдаёт только признак живости: без версии, окружения и аптайма.
    app.get("/api/health", (_req: Request, res: Response) => {
        res.json({ ok: true, service: SERVICE_NAME });
    });

    // ARCHITECT: шов registerRoutes: доменные маршруты следующих фаз подключаются здесь, то есть до
    // 404-fallback, поэтому он остаётся последним; в тестах через него регистрируется бросающий маршрут.
    registerRoutes?.(app);

    app.use((_req: Request, res: Response) => {
        res.status(404).json(errorEnvelope("NOT_FOUND", res));
    });

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (res.headersSent) {
            _next(err);

            return;
        }

        const status = resolveStatus(err);
        const code = resolveCode(status);
        const requestId = String(res.getHeader("x-request-id") ?? "");

        // ARCHITECT: в лог уходит одна JSON-строка; err.message не логируется никогда — сообщения
        // body-parser содержат фрагменты пользовательского ввода, которым не место в логах.
        console.error(
            JSON.stringify({
                level: "error",
                requestId,
                status,
                code,
                errorName: err instanceof Error ? err.name : "UnknownError",
            })
        );

        // ARCHITECT: в ответ не попадают ни err.message, ни stack — только code, безопасное сообщение и requestId.
        res.status(status).json(errorEnvelope(code, res));
    });

    return app;
}
