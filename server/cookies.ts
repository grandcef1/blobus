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

// ARCHITECT: режим Secure задаётся один раз в точках входа (server/index.ts, api/index.mjs) через
// configureCookies, а не читается из process.env здесь: окружение читает только composition root,
// env-модуль остаётся единственной точкой валидации. Дефолт — включён (fail-closed): несконфигурированное
// приложение не ставит куки без Secure.
let secureCookies = true;

export function configureCookies(options: { readonly secure: boolean }): void {
    secureCookies = options.secure;
}

/** Закрытые дефолты: HttpOnly и SameSite=Lax всегда, Secure — из configureCookies. */
function cookieDefaults(): CookieOptions {
    return {
        httpOnly: true,
        secure: secureCookies,
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

// ARCHITECT: парсим сырой заголовок Cookie сами: cookie-parser не добавляем (лишняя зависимость), а
// req.cookies без него всегда undefined. Первое вхождение имени выигрывает (RFC 6265), кавычки и
// percent-encoding разворачиваем; битые пары пропускаем, функция не бросает исключений.
/** Значение куки из сырого заголовка Cookie; undefined, если куки нет или заголовок битый. */
export function getCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (typeof header !== "string" || header === "") {
        return undefined;
    }

    for (const part of header.split(";")) {
        const eq = part.indexOf("=");
        if (eq <= 0) {
            continue;
        }
        if (part.slice(0, eq).trim() !== name) {
            continue;
        }
        let value = part.slice(eq + 1).trim();
        if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    return undefined;
}
