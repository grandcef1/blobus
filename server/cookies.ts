// ARCHITECT: куки HttpOnly (JS не читает, защита от XSS); Secure только в проде (локально http, куки без
// Secure работают); SameSite=Lax защищает от CSRF для GET-запросов, но для мутаций нужен double-submit;
// путь "/" охватывает весь сайт; домен не задаём, куки видны только на текущем домене.
import type { Request, Response } from "express";

export const COOKIE_NAMES = {
    accessToken: "blobus_access_token",
    refreshToken: "blobus_refresh_token",
    csrfToken: "blobus_csrf_token",
} as const;

export interface CookieOptions {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    path?: string;
    domain?: string;
}

/** Закрытые дефолты: HttpOnly и SameSite=Lax всегда, Secure — по окружению. */
function cookieDefaults(): CookieOptions {
    return {
        httpOnly: true,
        // ARCHITECT: Secure только в проде: локальный сервер работает по http, и кука с Secure не дошла бы.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    };
}

/** Ставит куку с дефолтами; options мержатся поверх, поэтому конкретный вызов может их ослабить. */
export function setCookie(
    res: Response,
    name: string,
    value: string,
    options?: CookieOptions
): void {
    res.cookie(name, value, { ...cookieDefaults(), ...options });
}

/** Снимает куку: тот же набор атрибутов, но пустое значение и нулевой срок. */
export function clearCookie(res: Response, name: string): void {
    res.cookie(name, "", { ...cookieDefaults(), maxAge: 0 });
}

// ARCHITECT: cookies в типах express — any и заполняет его только cookie-parser, поэтому значение
// проверяется на строку, а обращение идёт через optional chaining: без middleware это undefined.
/** Значение куки из запроса: нужен cookie-parser раньше в цепочке middleware, иначе всегда undefined. */
export function getCookie(req: Request, name: string): string | undefined {
    const value: unknown = req.cookies?.[name];

    return typeof value === "string" ? value : undefined;
}
