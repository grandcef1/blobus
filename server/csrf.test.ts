// ARCHITECT: middleware проверяются по реальному HTTP через шов buildApp(registerRoutes): та же цепочка
// cookie → csrf, что пойдёт в боевой app.ts в Ф3.4, но сам app.ts здесь не меняется. Негативных веток
// больше половины: 403 без токена, без Origin/Referer, с чужого origin и на login/logout.
// ARCHITECT: окружение не переключаем на node: общий setup-файл (src/test/setup.ts) трогает window, а
// нужные здесь Node-API (http, fetch) в jsdom доступны — как в server/app.test.ts.
import type { Server } from "node:http";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express, Request, Response as ExpressResponse } from "express";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.ts";
import { COOKIE_NAMES, clearCookie, configureCookies, getCookie, setCookie } from "./cookies.ts";
import { attachCsrfToken, createCsrfToken, validateCsrf } from "./csrf.ts";

const CSRF_COOKIE = COOKIE_NAMES.csrfToken;
// ARCHITECT: формат токена задан в тесте независимо от csrf.ts: 24 байта base64url = 32 символа — это
// контракт, который читает фронтенд, а не деталь реализации.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

interface RunningApp {
    readonly server: Server;
    readonly baseUrl: string;
}

interface ErrorEnvelopeBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly requestId: string;
    };
}

/** Пара заголовков double-submit: так их соберёт фронтенд после чтения куки. */
interface CsrfPair {
    readonly cookie: string;
    readonly token: string;
}

/** Поднимает приложение на случайном порту и возвращает адрес для запросов. */
async function startApp(app: Express = buildApp()): Promise<RunningApp> {
    const server = app.listen(0);
    await new Promise<void>((resolve) => {
        server.once("listening", () => resolve());
    });

    const address: AddressInfo | string | null = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Тестовый сервер не сообщил TCP-адрес");
    }

    return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

/** Сначала рвём keep-alive соединения fetch, потом ждём close: иначе прогон висит до таймаута. */
async function stopApp(server: Server): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
}

function ok(_req: Request, res: ExpressResponse): void {
    res.json({ ok: true });
}

/** Маршруты доводки через шов registerRoutes: боевое подключение middleware — Ф3.4. */
function registerTestRoutes(app: Express): void {
    app.get("/api/csrf-test", attachCsrfToken, (_req: Request, res: ExpressResponse) => {
        res.json({ token: res.locals.csrfToken });
    });
    app.use(validateCsrf);
    app.get("/api/echo", ok);
    app.post("/api/echo", ok);
    app.post("/api/auth/login", ok);
    app.post("/api/auth/logout", ok);
    app.get("/api/set-cookie", (_req: Request, res: ExpressResponse) => {
        setCookie(res, "t", "v");
        res.json({ ok: true });
    });
    app.get("/api/clear-cookie", (_req: Request, res: ExpressResponse) => {
        clearCookie(res, "t");
        res.json({ ok: true });
    });
}

const running = await startApp(buildApp(registerTestRoutes));
const origin = running.baseUrl;

afterAll(async () => {
    await stopApp(running.server);
});

// ARCHITECT: fail-closed — после каждого теста secure возвращается в исходное состояние (включён).
afterEach(() => {
    configureCookies({ secure: true });
});

/** Set-Cookie конкретной куки из ответа; undefined, если кука не выставлена. */
function setCookieHeader(response: Response, name: string): string | undefined {
    return response.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

/** Значение куки из Set-Cookie: от «имя=» до первого «;». */
function cookieValue(header: string): string {
    return header.slice(header.indexOf("=") + 1).split(";")[0];
}

/** Заголовки double-submit: токен берём безопасным GET, как это делает фронтенд. */
async function fetchCsrfPair(): Promise<CsrfPair> {
    const response = await fetch(`${origin}/api/csrf-test`);
    const header = setCookieHeader(response, CSRF_COOKIE);
    if (header === undefined) throw new Error("GET /api/csrf-test не выставил csrf-куку");

    const token = cookieValue(header);

    return { cookie: `${CSRF_COOKIE}=${token}`, token };
}

/** Сырой запрос с произвольным регистром метода: fetch нормализует метод и обход не воспроизведёт. */
function rawRequestStatus(method: string, path: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const url = new URL(path, origin);
        const outgoing = request(
            { hostname: url.hostname, port: url.port, method, path: url.pathname },
            (response) => {
                response.resume();
                response.once("end", () => resolve(response.statusCode ?? 0));
            }
        );

        outgoing.on("error", reject);
        outgoing.end();
    });
}

/** Минимальный fake-запрос: getCookie читает только заголовок Cookie. */
function requestWithCookie(cookie: string | undefined): Request {
    return { headers: cookie === undefined ? {} : { cookie } } as unknown as Request;
}

describe("getCookie", () => {
    it("находит значение среди нескольких кук с пробелами", () => {
        const req = requestWithCookie(`  a=1; ${CSRF_COOKIE}=target ; b=2`);

        expect(getCookie(req, CSRF_COOKIE)).toBe("target");
    });

    it("при дубликате имени отдаёт первое вхождение", () => {
        expect(getCookie(requestWithCookie("dup=first; dup=second"), "dup")).toBe("first");
    });

    it("раскрывает percent-encoding", () => {
        expect(getCookie(requestWithCookie("word=a%20b"), "word")).toBe("a b");
    });

    it("снимает двойные кавычки вокруг значения", () => {
        expect(getCookie(requestWithCookie('quoted="hello"'), "quoted")).toBe("hello");
    });

    it("пропускает пары без «=» и с пустым именем, находя валидную", () => {
        expect(getCookie(requestWithCookie("broken; =nameless; good=value"), "good")).toBe("value");
    });

    it("без заголовка Cookie возвращает undefined", () => {
        expect(getCookie(requestWithCookie(undefined), "any")).toBeUndefined();
    });

    it("на пустом заголовке Cookie возвращает undefined", () => {
        expect(getCookie(requestWithCookie(""), "any")).toBeUndefined();
    });

    it("возвращает undefined, когда имени нет среди кук", () => {
        expect(getCookie(requestWithCookie("a=1; b=2"), "missing")).toBeUndefined();
    });
});

describe("setCookie и clearCookie", () => {
    it("без Secure ставит HttpOnly, SameSite=Lax и Path=/", async () => {
        configureCookies({ secure: false });
        const response = await fetch(`${origin}/api/set-cookie`);
        const header = setCookieHeader(response, "t") ?? "";

        expect(header).toContain("HttpOnly");
        expect(header).toContain("SameSite=Lax");
        expect(header).toContain("Path=/");
        expect(header).not.toContain("Secure");
    });

    it("с Secure ставит Secure", async () => {
        configureCookies({ secure: true });
        const response = await fetch(`${origin}/api/set-cookie`);
        const header = setCookieHeader(response, "t") ?? "";

        expect(header).toContain("Secure");
    });

    it("clearCookie отдаёт пустое значение и Max-Age=0, сохраняя атрибуты", async () => {
        configureCookies({ secure: false });
        const response = await fetch(`${origin}/api/clear-cookie`);
        const header = setCookieHeader(response, "t") ?? "";

        expect(header).toMatch(/^t=;/);
        expect(header).toContain("Max-Age=0");
        expect(header).toContain("HttpOnly");
        expect(header).toContain("SameSite=Lax");
        expect(header).toContain("Path=/");
    });
});

describe("createCsrfToken", () => {
    it("выдаёт 32 символа base64url и не повторяется на двух вызовах", () => {
        const first = createCsrfToken();
        const second = createCsrfToken();

        expect(first).toMatch(TOKEN_PATTERN);
        expect(first).toHaveLength(32);
        expect(second).not.toBe(first);
    });
});

describe("validateCsrf и attachCsrfToken", () => {
    it("пропускает безопасный GET без токена", async () => {
        const response = await fetch(`${origin}/api/echo`);

        expect(response.status).toBe(200);
    });

    it("выдаёт csrf-куку без HttpOnly и тот же токен в теле ответа", async () => {
        const response = await fetch(`${origin}/api/csrf-test`);
        const header = setCookieHeader(response, CSRF_COOKIE) ?? "";
        const body = (await response.json()) as { token: string };

        expect(header).not.toContain("HttpOnly");
        expect(header).toContain("SameSite=Lax");
        expect(body.token).toMatch(TOKEN_PATTERN);
        expect(cookieValue(header)).toBe(body.token);
    });

    it("не ротирует токен при повторном запросе с валидной кукой", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/csrf-test`, { headers: { cookie } });
        const body = (await response.json()) as { token: string };

        expect(body.token).toBe(token);
        expect(setCookieHeader(response, CSRF_COOKIE)).toBeUndefined();
    });

    it("отклоняет мутацию без куки и заголовка безопасным конвертом", async () => {
        const response = await fetch(`${origin}/api/echo`, { method: "POST", headers: { origin } });
        const text = await response.text();
        const body = JSON.parse(text) as ErrorEnvelopeBody;

        expect(response.status).toBe(403);
        expect(body.error.code).toBe("FORBIDDEN");
        expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
        expect(body.error).not.toHaveProperty("stack");
        expect(text).not.toMatch(TOKEN_PATTERN);
    });

    it("отклоняет мутацию с кукой, но без заголовка x-csrf-token", async () => {
        const { cookie } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, origin },
        });

        expect(response.status).toBe(403);
        expect(((await response.json()) as ErrorEnvelopeBody).error.code).toBe("FORBIDDEN");
    });

    it("отклоняет мутацию с неверным заголовком x-csrf-token", async () => {
        const { cookie } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": createCsrfToken(), origin },
        });

        expect(response.status).toBe(403);
    });

    it("отклоняет мутацию с чужого Origin", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": token, origin: "https://evil.example" },
        });

        expect(response.status).toBe(403);
    });

    it("отклоняет мутацию с чужого Referer, когда Origin отсутствует", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": token, referer: "https://evil.example/page" },
        });

        expect(response.status).toBe(403);
    });

    it("отклоняет мутацию без Origin и Referer", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": token },
        });

        expect(response.status).toBe(403);
    });

    it("пропускает мутацию с same-origin Origin", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": token, origin },
        });

        expect(response.status).toBe(200);
    });

    it("пропускает мутацию с same-origin Referer без Origin", async () => {
        const { cookie, token } = await fetchCsrfPair();
        const response = await fetch(`${origin}/api/echo`, {
            method: "POST",
            headers: { cookie, "x-csrf-token": token, referer: `${origin}/page` },
        });

        expect(response.status).toBe(200);
    });

    it("не делает исключения для login: мутация без токена отклоняется", async () => {
        const response = await fetch(`${origin}/api/auth/login`, {
            method: "POST",
            headers: { origin },
        });

        expect(response.status).toBe(403);
    });

    it("не делает исключения для logout: мутация без токена отклоняется", async () => {
        const response = await fetch(`${origin}/api/auth/logout`, {
            method: "POST",
            headers: { origin },
        });

        expect(response.status).toBe(403);
    });

    it("нормализует метод: «post» в нижнем регистре не обходит проверку", async () => {
        const status = await rawRequestStatus("post", "/api/echo");

        expect(status).toBe(403);
    });
});
