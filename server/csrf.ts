// ARCHITECT: double-submit — токен в куке и в заголовке: атакующий сайт не читает куку (SameSite) и не
// подделывает заголовок из JS. Origin/Referer на мутациях ОБЯЗАТЕЛЕН и сверяется с hostname запроса
// (same-origin; порт и путь могут отличаться — дев-прокси). Исключений нет: login тоже мутация, иначе
// login CSRF логинит жертву в аккаунт атакующего; токен выдаётся attachCsrfToken на безопасном GET до
// логина (Ф3.4: GET /api/auth/csrf). Кука csrfToken не HttpOnly — фронтенд читает её и шлёт в заголовке.
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES, getCookie, setCookie } from "./cookies.ts";
import { errorEnvelope } from "./http.ts";

const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
// ARCHITECT: формат createCsrfToken: 24 байта base64url = 32 символа; куку иного формата считаем
// повреждённой и перевыпускаем.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

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

// ARCHITECT: проверяются только мутации: GET смысла не меняет, а от CSRF на чтении прикрывает SameSite=Lax;
// метод нормализуется к верхнему регистру, иначе «post» в нижнем регистре обошёл бы проверку (Express роутит
// методы без учёта регистра).
export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.includes(req.method.toUpperCase())) {
        next();
        return;
    }

    const cookieToken = getCookie(req, COOKIE_NAMES.csrfToken);
    const headerToken = req.headers[CSRF_HEADER];

    // ARCHITECT: нет куки или заголовок ей не равен — 403 без деталей: подсказка помогла бы подбору токена.
    if (
        cookieToken === undefined ||
        typeof headerToken !== "string" ||
        headerToken !== cookieToken
    ) {
        res.status(403).json(errorEnvelope("FORBIDDEN", res));
        return;
    }

    // ARCHITECT: Origin главнее Referer. Мутация без обоих заголовков отклоняется: браузер шлёт хотя бы
    // один, отсутствие обоих — признак не-браузерного клиента или вырезанных заголовков.
    const source =
        typeof req.headers.origin === "string" ? req.headers.origin : req.headers.referer;

    if (typeof source !== "string" || hostnameOf(source) !== req.hostname) {
        res.status(403).json(errorEnvelope("FORBIDDEN", res));
        return;
    }

    next();
}

// ARCHITECT: токен НЕ ротируется на каждый запрос: параллельные запросы и соседние вкладки иначе ловили
// бы 403 на гонке куки и заголовка. Перевыпуск — только если куки нет или формат повреждён; явная ротация
// при логине — отдельный шаг Ф3.4.
/** Выдаёт CSRF-токен: кука для double-submit и res.locals для рендера в HTML, если понадобится. */
export function attachCsrfToken(req: Request, res: Response, next: NextFunction): void {
    const existing = getCookie(req, COOKIE_NAMES.csrfToken);
    const token =
        existing !== undefined && TOKEN_PATTERN.test(existing) ? existing : createCsrfToken();

    if (token !== existing) {
        // ARCHITECT: кука csrfToken не HttpOnly, чтобы фронтенд мог её прочитать и отправить в заголовке.
        setCookie(res, COOKIE_NAMES.csrfToken, token, { httpOnly: false });
    }
    res.locals.csrfToken = token;

    next();
}
