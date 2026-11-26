// ARCHITECT: приложение собирается функцией, а не модулем-одиночкой: тесты поднимают его на случайном
// порту, а точка входа server/index.ts — на порту из окружения.
import { randomUUID } from "node:crypto";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { errorEnvelope } from "./http.ts";
import type { ErrorCode } from "./http.ts";
import { createMemoryRateLimitStore, createRateLimiter } from "./rate-limit.ts";
import type { RateLimitStore } from "./rate-limit.ts";
import { createAuthRouter } from "./routes/auth.ts";
import type { AuthLimiters } from "./routes/auth.ts";
import { createProfileRouter } from "./routes/profile.ts";
import { createSessionsRouter } from "./routes/sessions.ts";
import { createSettingsRouter } from "./routes/settings.ts";
import { createVocabularyRouter } from "./routes/vocabulary.ts";
import type { SupabaseEnv } from "./supabase.ts";

const SERVICE_NAME = "blobus-api";

/** Числовой статус ошибки в диапазоне 400–599; всё остальное — 500. */
function resolveStatus(error: unknown): number {
    if (typeof error === "object" && error !== null) {
        const candidate = error as { status?: unknown; statusCode?: unknown };
        const status =
            typeof candidate.status === "number" ? candidate.status : candidate.statusCode;

        if (
            typeof status === "number" &&
            Number.isInteger(status) &&
            status >= 400 &&
            status <= 599
        ) {
            return status;
        }
    }

    return 500;
}

function resolveCode(status: number): ErrorCode {
    // ARCHITECT: статусы, которые ставит наш код (401/403/429) и body-parser (413), не сворачиваются в
    // BAD_REQUEST: фронтенд-адаптер мапит code в i18n, и по нему отличается «войди заново» от «слишком часто».
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 413) return "PAYLOAD_TOO_LARGE";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 400 && status < 500) return "BAD_REQUEST";

    return "INTERNAL";
}

// ARCHITECT: requestId выставляется на каждом ответе, включая ошибки: по нему лог сервера сопоставляется
// с ответом, который увидел клиент.
function attachRequestId(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader("x-request-id", randomUUID());
    next();
}

// ARCHITECT: лимиты перебора для auth-маршрутов: логин 10 за 15 минут, регистрация 5 за час, refresh 60 за
// 15 минут, выход 30 за 15 минут (§16.4). Счёт в памяти подходит только дев-режиму и тестам: инстансы Vercel
// не делят память, а для прода тот же интерфейс RateLimitStore реализует общий счётчик.
const HOUR_MS = 60 * 60_000;
const QUARTER_HOUR_MS = 15 * 60_000;

function createAuthLimiters(store: RateLimitStore): AuthLimiters {
    return {
        signup: createRateLimiter({ store, windowMs: HOUR_MS, max: 5, scope: "auth:signup" }),
        login: createRateLimiter({
            store,
            windowMs: QUARTER_HOUR_MS,
            max: 10,
            scope: "auth:login",
        }),
        refresh: createRateLimiter({
            store,
            windowMs: QUARTER_HOUR_MS,
            max: 60,
            scope: "auth:refresh",
        }),
        logout: createRateLimiter({
            store,
            windowMs: QUARTER_HOUR_MS,
            max: 30,
            scope: "auth:logout",
        }),
    };
}

// ARCHITECT: Supabase-окружение приходит параметром, а не читается здесь: единственная точка чтения
// process.env — composition root (server/index.ts). Без него приложение поднимается без auth-маршрутов,
// поэтому /api/health остаётся доступен и не зависит от ключей Supabase.
export function buildApp(registerRoutes?: (app: Express) => void, env?: SupabaseEnv): Express {
    const app = express();

    app.disable("x-powered-by");
    // ARCHITECT: ровно один узел прокси перед приложением (Vercel edge): тогда req.ip — адрес клиента из
    // X-Forwarded-For, и лимитер считает по нему, а не по общему адресу прокси. Больше одного хопа
    // позволило бы клиенту подставить чужой адрес заголовком и обойти лимит.
    app.set("trust proxy", 1);

    // ARCHITECT: дефолтов helmet достаточно для JSON-API; CSP для SPA живёт в vercel.json, потому что
    // разметку отдаёт статика, а не этот сервер.
    app.use(helmet());
    app.use(attachRequestId);
    // ARCHITECT: увеличенное тело принимается только маршрутом аватара (картинка в base64);
    // глобальный лимит 16kb для остальных маршрутов сохраняется (§16.7). Парсер помечает тело
    // разобранным, поэтому глобальный парсер его пропускает.
    app.use("/api/profile/avatar", express.json({ limit: "400kb" }));
    // ARCHITECT: лимит тела стоит до парсинга — body-parser отклонит слишком большой запрос, не разбирая JSON.
    app.use(express.json({ limit: "16kb" }));

    // Health отдаёт только признак живости: без версии, окружения и аптайма.
    app.get("/api/health", (_req: Request, res: Response) => {
        res.json({ ok: true, service: SERVICE_NAME });
    });

    // ARCHITECT: auth-маршруты встают между health и швом registerRoutes, то есть до 404-fallback; порядок
    // лимитер → validateCsrf → обработчик задан внутри роутера, поэтому CSRF-проверка стоит перед каждым
    // auth-обработчиком, а не только перед выбранными.
    if (env !== undefined) {
        app.use(
            "/api/auth",
            createAuthRouter({ env, limiters: createAuthLimiters(createMemoryRateLimitStore()) })
        );
        // ARCHITECT: доменные роутеры чтения монтируются рядом с auth, до шва registerRoutes и 404-fallback.
        app.use("/api/profile", createProfileRouter({ env }));
        app.use("/api/sessions", createSessionsRouter({ env }));
        app.use("/api/settings", createSettingsRouter({ env }));
        app.use("/api/vocabulary", createVocabularyRouter({ env }));
    }

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
