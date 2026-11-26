// ARCHITECT: общие HTTP-хелперы серверных тестов: приложение на случайном порту, хранилище кук, CSRF-пара и
// вход тестового пользователя. Сеть не поднимается — запросы идут на локальный стек через настоящий
// транспорт buildApp, поэтому негативные проверки проверяют то же, что увидит клиент (§16.14).
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { buildApp } from "./app.ts";
import { COOKIE_NAMES } from "./cookies.ts";
import { createAdminClient } from "./test-stack.ts";
import type { SupabaseEnv } from "./supabase.ts";

export interface RunningApp {
    readonly server: Server;
    readonly baseUrl: string;
}

export interface ErrorEnvelopeBody {
    readonly error: {
        readonly code: string;
        readonly message: string;
        readonly requestId: string;
    };
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
export type Jar = Record<string, string>;

export const CSRF_HEADER = "x-csrf-token";

/** Поднимает приложение на случайном порту и возвращает адрес для запросов. */
export async function startApp(env: SupabaseEnv): Promise<RunningApp> {
    const server = buildApp(undefined, env).listen(0);

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
export async function stopApp(server: Server): Promise<void> {
    server.closeAllConnections();

    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
}

/** Приложение живёт один тест: лимиты в памяти экземпляра не перетекают в соседние проверки. */
export async function withApp(
    env: SupabaseEnv,
    run: (app: RunningApp) => Promise<void>
): Promise<void> {
    const running = await startApp(env);

    try {
        await run(running);
    } finally {
        await stopApp(running.server);
    }
}

/** Set-Cookie конкретной куки из ответа; undefined, если кука не выставлена. */
export function setCookieHeader(response: Response, name: string): string | undefined {
    return response.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

/** Значение куки из Set-Cookie: от «имя=» до первого «;». */
export function cookieValue(header: string): string {
    return header.slice(header.indexOf("=") + 1).split(";")[0];
}

/** Дополняет хранилище кук ответом: пустое значение снимает куку, как это делает браузер. */
export function applyCookies(jar: Jar, response: Response): Jar {
    const next: Jar = { ...jar };

    for (const header of response.headers.getSetCookie()) {
        const pair = header.split(";")[0];
        const name = pair.slice(0, pair.indexOf("=")).trim();
        const value = cookieValue(pair);

        if (value === "") delete next[name];
        else next[name] = value;
    }

    return next;
}

/** Заголовок Cookie из хранилища: браузерного поведения здесь нет, состав задаёт тест. */
export function cookieHeader(jar: Jar): string {
    return Object.entries(jar)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
}

/** Заголовки мутации: куки сессии, csrf-токен из них и same-origin Origin. */
export function mutationHeaders(jar: Jar, baseUrl: string): Record<string, string> {
    return {
        cookie: cookieHeader(jar),
        [CSRF_HEADER]: jar[COOKIE_NAMES.csrfToken] ?? "",
        origin: baseUrl,
    };
}

/** Заголовки чтения: только куки — CSRF безопасному методу не нужен. */
export function readHeaders(jar: Jar): Record<string, string> {
    return { cookie: cookieHeader(jar) };
}

/** CSRF-пара как её соберёт фронтенд: токен берётся безопасным GET и лежит в куке. */
export async function fetchCsrfPair(baseUrl: string): Promise<Jar> {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    const header = setCookieHeader(response, COOKIE_NAMES.csrfToken);

    if (header === undefined) throw new Error("GET /api/auth/csrf не выставил csrf-куку");

    return { [COOKIE_NAMES.csrfToken]: cookieValue(header) };
}

export function postJson(
    baseUrl: string,
    path: string,
    body: unknown,
    headers: Record<string, string>
): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

/** GET с кукой сессии: то же, что делает apiFetch на клиенте. */
export function getJson(baseUrl: string, path: string, jar: Jar): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { headers: readHeaders(jar) });
}

/** Сессия в куках после логина: access, refresh и уже ротированный csrf. */
export async function loginSession(baseUrl: string, email: string, password: string): Promise<Jar> {
    const pair = await fetchCsrfPair(baseUrl);
    const response = await postJson(
        baseUrl,
        "/api/auth/login",
        { email, password },
        mutationHeaders(pair, baseUrl)
    );

    if (response.status !== 200)
        throw new Error(`логин тестового пользователя не удался: ${response.status}`);

    return applyCookies(pair, response);
}

/** Пользователь с подтверждённой почтой: пароль задаёт вызывающий, аккаунт живёт до уборки в afterAll. */
export async function createConfirmedUser(email: string, password: string): Promise<string> {
    const created = await createAdminClient().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (created.data.user === null)
        throw new Error("админ-создание пользователя не вернуло запись");

    return created.data.user.id;
}

/** Ошибка конверта из тела ответа: негативные проверки читают код, а не текст. */
export function errorBody(body: unknown): ErrorEnvelopeBody {
    return body as ErrorEnvelopeBody;
}
