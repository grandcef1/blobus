// ARCHITECT: double-submit — токен в куке и в заголовке, атакующий не может прочитать куку из JS на чужом
// сайте (SameSite) и не может подделать заголовок; Origin/Referer проверяются на совпадение hostname, а не
// полное совпадение URL (порт и путь могут отличаться); /api/auth/login и /api/auth/logout исключены,
// потому что до входа CSRF-токена ещё нет, а logout делает только сервер по refresh-токену; кука csrfToken
// не HttpOnly, чтобы фронтенд мог её прочитать и отправить в заголовке.
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES, getCookie, setCookie } from "./cookies.ts";
import { errorEnvelope } from "./http.ts";

const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
// ARCHITECT: до входа CSRF-токена ещё нет, а logout делает только сервер по refresh-токену.
const CSRF_EXEMPT_PATHS = ["/api/auth/login", "/api/auth/logout"];

/** 24 случайных байта в base64url — 32 символа: столько ждёт фронтенд и хватает на энтропию. */
export function createCsrfToken(): string {
    return randomBytes(24).toString("base64url");
}

/** hostname абсолютного URL; для относительного Referer и мусора — undefined. */
function hostnameOf(value: string): string | undefined {
    try {
        return new URL(value).hostname;
    } catch {
        return undefined;
    }
}

// ARCHITECT: проверяются только мутации: GET смысла не меняет, а от CSRF на чтении прикрывает SameSite=Lax.
export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.includes(req.method) || CSRF_EXEMPT_PATHS.includes(req.path)) {
        next();

        return;
    }

    const cookieToken = getCookie(req, COOKIE_NAMES.csrfToken);
    const headerToken = req.headers[CSRF_HEADER];
    const headerMatches = typeof headerToken === "string" && headerToken === cookieToken;

    // ARCHITECT: нет куки или заголовок ей не равен — 403 без деталей: подсказка помогла бы подбору токена.
    if (cookieToken === undefined || !headerMatches) {
        res.status(403).json(errorEnvelope("FORBIDDEN", res));

        return;
    }

    // ARCHITECT: Origin главнее Referer: на мутации браузер шлёт его всегда, а Referer может быть вырезан.
    const source =
        typeof req.headers.origin === "string" ? req.headers.origin : req.headers.referer;

    if (typeof source === "string" && hostnameOf(source) !== req.hostname) {
        res.status(403).json(errorEnvelope("FORBIDDEN", res));

        return;
    }

    next();
}

/** Выдаёт CSRF-токен: кука для double-submit и res.locals для рендера в HTML, если понадобится. */
export function attachCsrfToken(_req: Request, res: Response, next: NextFunction): void {
    const token = createCsrfToken();

    // ARCHITECT: кука csrfToken не HttpOnly, чтобы фронтенд мог её прочитать и отправить в заголовке.
    setCookie(res, COOKIE_NAMES.csrfToken, token, { httpOnly: false });
    res.locals.csrfToken = token;

    next();
}
