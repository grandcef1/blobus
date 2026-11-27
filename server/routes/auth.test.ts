// ARCHITECT: маршруты проверяются по реальному HTTP, и каждый тест поднимает свой экземпляр приложения:
// лимиты перебора считаются в памяти экземпляра, поэтому соседние тесты не съедают бюджет друг друга, а
// рабочие значения лимитов остаются боевыми. Стек Supabase локальный (npx supabase start), окружение не
// переключаем — как в server/app.test.ts.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { COOKIE_NAMES, configureCookies } from "../cookies.ts";
import type { SupabaseEnv } from "../supabase.ts";
import {
    createAdminClient,
    createAnonClient,
    createUserClient,
    readLocalStack,
} from "../test-stack.ts";

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

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `routes-${randomUUID()}`;
const PASSWORD = `Routes-${randomUUID()}-1`;
// ARCHITECT: имя регистрации стало обязательным полем: строка profiles берёт его из метаданных GoTrue.
const NAME = "Марта Ковалёва";
const CSRF_HEADER = "x-csrf-token";
const SESSION_COOKIES = [COOKIE_NAMES.accessToken, COOKIE_NAMES.refreshToken];
// ARCHITECT: формат CSRF-токена задан тестом независимо от csrf.ts: 24 байта base64url = 32 символа —
// это контракт, который читает фронтенд.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
/** Код Postgres «недостаточно прав»: колонка флага вне колоночного гранта update на profiles. */
const INSUFFICIENT_PRIVILEGE = "42501";

let env: SupabaseEnv | undefined;
let userId: string | undefined;
let userEmail: string | undefined;

/** Отдаёт окружение стека и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctxEnv(): SupabaseEnv {
    if (env === undefined)
        throw new Error("local Supabase stack is not running: run npx supabase start");

    return env;
}

/** Пользователь, созданный админ-клиентом в beforeAll: на нём проверяются логин и сессия. */
function ctxUser(): { readonly id: string; readonly email: string } {
    if (userId === undefined || userEmail === undefined)
        throw new Error("тестовый пользователь не создан");

    return { id: userId, email: userEmail };
}

/** Поднимает приложение на случайном порту и возвращает адрес для запросов. */
async function startApp(envOverrides: Partial<SupabaseEnv> = {}): Promise<RunningApp> {
    const server = buildApp(undefined, { ...ctxEnv(), ...envOverrides }).listen(0);
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

/** Приложение живёт один тест: лимиты в памяти экземпляра не перетекают в соседние проверки. */
async function withAuthApp(run: (app: RunningApp) => Promise<void>): Promise<void> {
    const running = await startApp();

    try {
        await run(running);
    } finally {
        await stopApp(running.server);
    }
}

/** Приложение с подменённой частью окружения: конфигурация провайдеров проверяется своим запуском. */
async function withConfiguredApp(
    envOverrides: Partial<SupabaseEnv>,
    run: (app: RunningApp) => Promise<void>
): Promise<void> {
    const running = await startApp(envOverrides);

    try {
        await run(running);
    } finally {
        await stopApp(running.server);
    }
}

/** Set-Cookie конкретной куки из ответа; undefined, если кука не выставлена. */
function setCookieHeader(response: Response, name: string): string | undefined {
    return response.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

/** Значение куки из Set-Cookie: от «имя=» до первого «;». */
function cookieValue(header: string): string {
    return header.slice(header.indexOf("=") + 1).split(";")[0];
}

/**
 * Set-Cookie кук сессии с непустым значением: тест доказывает, что сессия не выдана. Пустое значение —
 * это снятие куки (clearCookie), которое как раз и должно происходить при провале обмена.
 */
function sessionCookieHeaders(response: Response): readonly string[] {
    return response.headers
        .getSetCookie()
        .filter(
            (header) =>
                SESSION_COOKIES.some((name) => header.startsWith(`${name}=`)) &&
                cookieValue(header) !== ""
        );
}

/** Дополняет хранилище кук ответом: пустое значение снимает куку, как это делает браузер. */
function applyCookies(jar: Jar, response: Response): Jar {
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
function cookieHeader(jar: Jar): string {
    return Object.entries(jar)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
}

/** Заголовки мутации: куки сессии, csrf-токен из них и same-origin Origin. */
function mutationHeaders(jar: Jar, baseUrl: string): Record<string, string> {
    return {
        cookie: cookieHeader(jar),
        [CSRF_HEADER]: jar[COOKIE_NAMES.csrfToken] ?? "",
        origin: baseUrl,
    };
}

/** CSRF-пара как её соберёт фронтенд: токен берётся безопасным GET и лежит в куке. */
async function fetchCsrfPair(baseUrl: string): Promise<Jar> {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    const header = setCookieHeader(response, COOKIE_NAMES.csrfToken);

    if (header === undefined) throw new Error("GET /api/auth/csrf не выставил csrf-куку");

    return { [COOKIE_NAMES.csrfToken]: cookieValue(header) };
}

function postJson(
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

/** Сессия в куках после логина: access, refresh и уже ротированный csrf. */
async function loginSession(baseUrl: string, email: string = ctxUser().email): Promise<Jar> {
    const pair = await fetchCsrfPair(baseUrl);
    const response = await postJson(
        baseUrl,
        "/api/auth/login",
        { email, password: PASSWORD },
        mutationHeaders(pair, baseUrl)
    );

    if (response.status !== 200)
        throw new Error(`логин тестового пользователя не удался: ${response.status}`);

    return applyCookies(pair, response);
}

/** Существует ли пользователь: единственный источник правды — список админ-API локального стека. */
async function userExists(email: string): Promise<boolean> {
    const { data } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 });

    return (data?.users ?? []).some((user) => user.email === email);
}

/** Пользователь с подтверждённой почтой: пароль прогона один, аккаунт живёт до afterAll. */
async function createConfirmedUser(email: string): Promise<string> {
    const created = await createAdminClient().auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
    });

    if (created.data.user === null)
        throw new Error("админ-создание пользователя не вернуло запись");

    return created.data.user.id;
}

/** Пара токенов прямо из GoTrue: ровно то, что приносит браузер после PKCE-танца с провайдером. */
async function sessionPairFor(
    email: string
): Promise<{ accessToken: string; refreshToken: string }> {
    const { data, error } = await createAnonClient().auth.signInWithPassword({
        email,
        password: PASSWORD,
    });

    if (error !== null || data.session === null) {
        throw new Error("вход тестового пользователя не вернул сессию");
    }

    return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

function errorBody(body: unknown): ErrorEnvelopeBody {
    return body as ErrorEnvelopeBody;
}

/** Флаг из БД сервисным клиентом: сверка ответа маршрута с источником правды (§16.5, RLS обходится). */
async function dbOnboardingFlag(id: string): Promise<string | null> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", id)
        .maybeSingle();

    if (error !== null) throw error;

    return data === null ? null : data.onboarding_completed_at;
}

/** Id пользователя по адресу: нужен, чтобы сверить строку профиля с источником правды (§16.5). */
async function userIdByEmail(email: string): Promise<string | null> {
    const { data } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 });

    return (data?.users ?? []).find((user) => user.email === email)?.id ?? null;
}

/** Имя из строки профиля сервисным клиентом: проверяем БД, а не ответ маршрута (§16.5). */
async function dbDisplayName(id: string): Promise<string | null> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("display_name")
        .eq("id", id)
        .maybeSingle();

    if (error !== null) throw error;

    return data === null ? null : data.display_name;
}

/** Свежий аккаунт (триггер оставляет флаг null) и его сессия: каждый тест изолирован своим юзером. */
async function freshSession(
    baseUrl: string
): Promise<{ readonly id: string; readonly email: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-fresh-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email);

    return { id, email, jar: await loginSession(baseUrl, email) };
}

beforeAll(async () => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };

    const email = `${EMAIL_PREFIX}-user@example.test`;

    userId = await createConfirmedUser(email);
    userEmail = email;
}, 30_000);

// ARCHITECT: уборка не должна прятать результат тестов: удаляются все аккаунты прогона по префиксу, а
// ошибка удаления гасится — иначе падение afterAll выглядело бы как падение проверок.
afterAll(async () => {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const stale = (data?.users ?? []).filter((user) => (user.email ?? "").startsWith(EMAIL_PREFIX));

    for (const user of stale) {
        await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }
}, 30_000);

// ARCHITECT: локальный стек работает по http, поэтому Secure выключен на время теста; после каждого теста
// возвращаем fail-closed дефолт, как это делает csrf.test.ts.
beforeEach(() => {
    configureCookies({ secure: false });
});

afterEach(() => {
    configureCookies({ secure: true });
});

describe("GET /api/auth/csrf", () => {
    it("выдаёт токен в теле и в куке, кука читаема из JS", async () => {
        await withAuthApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/auth/csrf`);
            const body = (await response.json()) as { csrfToken: string };
            const header = setCookieHeader(response, COOKIE_NAMES.csrfToken) ?? "";

            expect(response.status).toBe(200);
            expect(body.csrfToken).toMatch(TOKEN_PATTERN);
            expect(cookieValue(header)).toBe(body.csrfToken);
            // ARCHITECT: куку читает фронтенд, поэтому HttpOnly у неё быть не должно.
            expect(header).not.toContain("HttpOnly");
        });
    });
});

describe("POST /api/auth/signup", () => {
    it("регистрирует пользователя и отвечает так же на занятый e-mail", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const email = `${EMAIL_PREFIX}-dup@example.test`;
            const headers = mutationHeaders(pair, app.baseUrl);

            const first = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email, password: PASSWORD },
                headers
            );
            const firstBody = await first.text();
            const second = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email, password: PASSWORD },
                headers
            );
            const secondBody = await second.text();

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(secondBody).toBe(firstBody);
            // ARCHITECT: тело и код совпадают, кук сессии нет ни в одном ответе: повторная регистрация не
            // рассказывает, что аккаунт уже существует, и не логинит никого (§16.4).
            expect(sessionCookieHeaders(first)).toEqual([]);
            expect(sessionCookieHeaders(second)).toEqual([]);
            expect(await userExists(email)).toBe(true);
        });
    }, 30_000);

    it("отклоняет короткий пароль и лишнее поле, не создавая аккаунт", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const shortEmail = `${EMAIL_PREFIX}-short@example.test`;
            const extraEmail = `${EMAIL_PREFIX}-extra@example.test`;

            const short = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email: shortEmail, password: "Short1" },
                headers
            );
            const extra = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email: extraEmail, password: PASSWORD, role: "pro" },
                headers
            );

            expect(short.status).toBe(400);
            expect(errorBody(await short.json()).error.code).toBe("BAD_REQUEST");
            // ARCHITECT: strictObject: неизвестное поле — отказ, а не тихо отброшенное значение: клиент не
            // должен думать, что сервер принял роль или тариф (§16.2).
            expect(extra.status).toBe(400);
            expect(await userExists(shortEmail)).toBe(false);
            expect(await userExists(extraEmail)).toBe(false);
        });
    }, 30_000);

    it("отклоняет слишком длинные адрес и пароль", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const longPasswordEmail = `${EMAIL_PREFIX}-long@example.test`;

            const longEmail = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email: `${"a".repeat(250)}@example.test`, password: PASSWORD },
                headers
            );
            const longPassword = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email: longPasswordEmail, password: `Aa1${"x".repeat(80)}` },
                headers
            );

            expect(longEmail.status).toBe(400);
            expect(longPassword.status).toBe(400);
            expect(await userExists(longPasswordEmail)).toBe(false);
        });
    }, 30_000);

    it("не принимает регистрацию без CSRF-пары", async () => {
        await withAuthApp(async (app) => {
            const email = `${EMAIL_PREFIX}-nocsrf@example.test`;
            const response = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email, password: PASSWORD },
                { origin: app.baseUrl }
            );

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(await userExists(email)).toBe(false);
        });
    }, 30_000);

    it("ограничивает регистрацию пятью запросами в час", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const response = await postJson(
                    app.baseUrl,
                    "/api/auth/signup",
                    { name: NAME, email: "not-an-email", password: "x" },
                    headers
                );

                attempted.push(response.status);
            }

            const limited = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email: "not-an-email", password: "x" },
                headers
            );

            // ARCHITECT: лимитер стоит первым middleware, поэтому в счёт попадают и отклонённые тела: поток
            // не доходит до Zod и до Supabase, 429 приходит шестым (§16.4).
            expect(attempted).toEqual([400, 400, 400, 400, 400]);
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 30_000);

    it("имя регистрации попадает в display_name профиля через метаданные", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const email = `${EMAIL_PREFIX}-named-${randomUUID()}@example.test`;
            const response = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email, password: PASSWORD },
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(200);

            const id = await userIdByEmail(email);

            if (id === null) throw new Error("аккаунт регистрации не найден");

            // ARCHITECT: строку profiles заводит триггер handle_new_user, поэтому имя обязано прийти из
            // метаданных регистрации, а не остаться пустым: иначе пользователь видит заглушку «Ученик».
            expect(await dbDisplayName(id)).toBe(NAME);
        });
    }, 30_000);

    it("отклоняет пустое и слишком длинное имя, не создавая аккаунт", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const emptyEmail = `${EMAIL_PREFIX}-noname-${randomUUID()}@example.test`;
            const longEmail = `${EMAIL_PREFIX}-longname-${randomUUID()}@example.test`;

            const empty = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: "   ", email: emptyEmail, password: PASSWORD },
                headers
            );
            const long = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: "И".repeat(81), email: longEmail, password: PASSWORD },
                headers
            );

            // ARCHITECT: граница 80 совпадает с CHECK-ограничением char_length(display_name) в схеме (§16.6).
            expect(empty.status).toBe(400);
            expect(long.status).toBe(400);
            expect(await userExists(emptyEmail)).toBe(false);
            expect(await userExists(longEmail)).toBe(false);
        });
    }, 30_000);
});

describe("POST /api/auth/login", () => {
    it("ставит куки сессии на верных данных и ротирует CSRF-токен", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const user = ctxUser();
            const response = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: user.email, password: PASSWORD },
                mutationHeaders(pair, app.baseUrl)
            );
            const body = (await response.json()) as {
                user: { id: string; email: string; onboardingCompleted: boolean };
            };
            const access = setCookieHeader(response, COOKIE_NAMES.accessToken) ?? "";
            const refresh = setCookieHeader(response, COOKIE_NAMES.refreshToken) ?? "";
            const rotated = setCookieHeader(response, COOKIE_NAMES.csrfToken) ?? "";

            expect(response.status).toBe(200);
            // ARCHITECT: наружу уходит только DTO — id, адрес и флаг онбординга, без токенов и служебных полей.
            expect(body.user).toEqual({
                id: user.id,
                email: user.email,
                onboardingCompleted: false,
            });
            expect(access).toContain("HttpOnly");
            expect(access).toContain("SameSite=Lax");
            expect(access).toContain("Path=/");
            expect(refresh).toContain("HttpOnly");
            // ARCHITECT: токен, выданный до аутентификации, не переезжает в сессию: сравнение с парой,
            // полученной до логина (§16.4).
            expect(cookieValue(rotated)).toMatch(TOKEN_PATTERN);
            expect(cookieValue(rotated)).not.toBe(pair[COOKIE_NAMES.csrfToken]);
        });
    }, 30_000);

    it("отвечает 401 на неверный пароль и не повторяет ввод", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const secret = "Wrong-Pass-9876";
            const response = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: ctxUser().email, password: secret },
                mutationHeaders(pair, app.baseUrl)
            );
            const text = await response.text();

            expect(response.status).toBe(401);
            expect(errorBody(JSON.parse(text)).error.code).toBe("UNAUTHORIZED");
            expect(text).not.toContain(secret);
            expect(text).not.toContain("stack");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("отвечает одинаково на неверный пароль и несуществующий e-mail", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const known = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: ctxUser().email, password: "Wrong-Pass-9876" },
                headers
            );
            const unknown = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: `${EMAIL_PREFIX}-ghost@example.test`, password: "Wrong-Pass-9876" },
                headers
            );
            const knownBody = errorBody(await known.json());
            const unknownBody = errorBody(await unknown.json());

            expect(known.status).toBe(401);
            expect(unknown.status).toBe(401);
            // ARCHITECT: requestId различается по определению, а код и текст обязаны совпадать: иначе
            // существование аккаунта читается по ответу (§16.4).
            expect(unknownBody.error.code).toBe(knownBody.error.code);
            expect(unknownBody.error.message).toBe(knownBody.error.message);
            expect(knownBody.error.code).toBe("UNAUTHORIZED");
        });
    }, 30_000);

    it("не принимает логин без CSRF-заголовка", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: ctxUser().email, password: PASSWORD },
                { cookie: cookieHeader(pair), origin: app.baseUrl }
            );

            // ARCHITECT: логин — мутация: без парного заголовка он отклоняется, иначе login CSRF логинил бы
            // жертву в аккаунт атакующего (см. csrf.ts).
            expect(response.status).toBe(403);
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("ограничивает логин десятью попытками за 15 минут", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const body = { email: ctxUser().email, password: "Wrong-Pass-9876" };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const response = await postJson(app.baseUrl, "/api/auth/login", body, headers);

                attempted.push(response.status);
            }

            const limited = await postJson(app.baseUrl, "/api/auth/login", body, headers);

            expect(attempted).toEqual([401, 401, 401, 401, 401, 401, 401, 401, 401, 401]);
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
        });
    }, 60_000);
});

describe("GET /api/auth/me", () => {
    it("отдаёт только DTO пользователя по access-куке", async () => {
        await withAuthApp(async (app) => {
            const session = await loginSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/auth/me`, {
                headers: { cookie: cookieHeader(session) },
            });
            const body = (await response.json()) as { user: Record<string, unknown> };
            const user = ctxUser();

            expect(response.status).toBe(200);
            // ARCHITECT: наружу уходят id, адрес и флаг онбординга: ни aud, ни exp, ни токенов (§16.13).
            expect(Object.keys(body.user).sort()).toEqual(["email", "id", "onboardingCompleted"]);
            // ARCHITECT: ctxUser создан после миграции, триггер оставил флаг null — онбординг не пройден.
            expect(body.user).toEqual({
                id: user.id,
                email: user.email,
                onboardingCompleted: false,
            });
        });
    }, 30_000);

    it("отвечает 401 без access-куки", async () => {
        await withAuthApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/auth/me`);
            const body = errorBody(await response.json());

            expect(response.status).toBe(401);
            expect(body.error.code).toBe("UNAUTHORIZED");
        });
    }, 30_000);

    it("отвечает 401 на поддельную куку тем же телом, что без куки", async () => {
        await withAuthApp(async (app) => {
            const sentinel = "fake-token-sentinel";
            const anonymous = await fetch(`${app.baseUrl}/api/auth/me`);
            const anonymousBody = errorBody(await anonymous.json());
            const forged = await fetch(`${app.baseUrl}/api/auth/me`, {
                headers: { cookie: `${COOKIE_NAMES.accessToken}=${sentinel}` },
            });
            const forgedText = await forged.text();
            const forgedBody = errorBody(JSON.parse(forgedText));

            expect(forged.status).toBe(401);
            expect(forgedBody.error.code).toBe(anonymousBody.error.code);
            expect(forgedBody.error.message).toBe(anonymousBody.error.message);
            // ARCHITECT: токен не возвращается клиенту ни в теле, ни в заголовках (§16.11).
            expect(forgedText).not.toContain(sentinel);
        });
    }, 30_000);
});

describe("POST /api/auth/refresh", () => {
    it("отвечает 401 без refresh-куки", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/refresh",
                {},
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(401);
            expect(errorBody(await response.json()).error.code).toBe("UNAUTHORIZED");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("ротирует обе куки сессии по refresh-токену", async () => {
        await withAuthApp(async (app) => {
            const session = await loginSession(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/refresh",
                {},
                mutationHeaders(session, app.baseUrl)
            );
            const rotated = applyCookies(session, response);

            expect(response.status).toBe(200);
            // ARCHITECT: GoTrue выдаёт новую пару токенов, и старый refresh-токен перестаёт работать — это и
            // есть ротация, ради которой клиент обновляет сессию (§16.4).
            expect(rotated[COOKIE_NAMES.accessToken]).not.toBe(session[COOKIE_NAMES.accessToken]);
            expect(rotated[COOKIE_NAMES.refreshToken]).toBeTruthy();
            expect(rotated[COOKIE_NAMES.refreshToken]).not.toBe(session[COOKIE_NAMES.refreshToken]);
        });
    }, 30_000);
});

describe("POST /api/auth/logout", () => {
    it("снимает куки сессии, отзывает её и ротирует CSRF", async () => {
        await withAuthApp(async (app) => {
            const session = await loginSession(app.baseUrl);
            const revokedRefresh = session[COOKIE_NAMES.refreshToken] ?? "";
            const csrfBefore = session[COOKIE_NAMES.csrfToken];
            const first = await postJson(
                app.baseUrl,
                "/api/auth/logout",
                {},
                mutationHeaders(session, app.baseUrl)
            );
            const afterLogout = applyCookies(session, first);

            expect(first.status).toBe(200);
            expect(afterLogout[COOKIE_NAMES.accessToken]).toBeUndefined();
            expect(afterLogout[COOKIE_NAMES.refreshToken]).toBeUndefined();
            expect(afterLogout[COOKIE_NAMES.csrfToken]).not.toBe(csrfBefore);

            // ARCHITECT: выход отзывает сессию на сервере (scope local), поэтому старый refresh-токен больше
            // не обменивается на новую пару: иначе украденный токен пережил бы выход (§16.4).
            const revoked = await postJson(
                app.baseUrl,
                "/api/auth/refresh",
                {},
                mutationHeaders(
                    { ...afterLogout, [COOKIE_NAMES.refreshToken]: revokedRefresh },
                    app.baseUrl
                )
            );

            expect(revoked.status).toBe(401);

            // ARCHITECT: повторный выход без сессии тоже успешен: он ничего не раскрывает и ничего не ломает.
            const second = await postJson(
                app.baseUrl,
                "/api/auth/logout",
                {},
                mutationHeaders(afterLogout, app.baseUrl)
            );

            expect(second.status).toBe(200);
        });
    }, 30_000);
});

describe("POST /api/auth/oauth/exchange", () => {
    it("ставит куки сессии по паре токенов и ротирует CSRF", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const user = ctxUser();
            const tokens = await sessionPairFor(user.email);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                { access_token: tokens.accessToken, refresh_token: tokens.refreshToken },
                mutationHeaders(pair, app.baseUrl)
            );
            const body = (await response.json()) as {
                user: { id: string; email: string; onboardingCompleted: boolean };
            };
            const access = setCookieHeader(response, COOKIE_NAMES.accessToken) ?? "";
            const refresh = setCookieHeader(response, COOKIE_NAMES.refreshToken) ?? "";
            const rotated = setCookieHeader(response, COOKIE_NAMES.csrfToken) ?? "";

            expect(response.status).toBe(200);
            // ARCHITECT: поле присутствует и соответствует БД: сверяем ответ маршрута с колонкой профиля.
            expect(body.user).toEqual({
                id: user.id,
                email: user.email,
                onboardingCompleted: (await dbOnboardingFlag(user.id)) !== null,
            });
            expect(access).toContain("HttpOnly");
            expect(access).toContain("SameSite=Lax");
            expect(refresh).toContain("HttpOnly");
            // ARCHITECT: refresh после OAuth — не сессионная кука, а 30-дневная: танец начинается на стороне
            // провайдера, и сессионная кука терялась бы при закрытии вкладки.
            expect(refresh).toContain("Max-Age=");
            expect(cookieValue(rotated)).not.toBe(pair[COOKIE_NAMES.csrfToken]);
        });
    }, 30_000);

    it("отвечает 401 на испорченный access-токен и не ставит куки", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const tokens = await sessionPairFor(ctxUser().email);
            const broken = `${tokens.accessToken.slice(0, -10)}broken-token`;
            const response = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                { access_token: broken, refresh_token: tokens.refreshToken },
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(401);
            expect(errorBody(await response.json()).error.code).toBe("UNAUTHORIZED");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("отвечает 401, когда refresh-токен принадлежит другому пользователю", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const foreignEmail = `${EMAIL_PREFIX}-foreign@example.test`;

            await createConfirmedUser(foreignEmail);

            const mine = await sessionPairFor(ctxUser().email);
            const foreign = await sessionPairFor(foreignEmail);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                { access_token: mine.accessToken, refresh_token: foreign.refreshToken },
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(401);
            expect(errorBody(await response.json()).error.code).toBe("UNAUTHORIZED");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("не принимает обмен без CSRF-пары", async () => {
        await withAuthApp(async (app) => {
            const tokens = await sessionPairFor(ctxUser().email);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                { access_token: tokens.accessToken, refresh_token: tokens.refreshToken },
                { origin: app.baseUrl }
            );

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("отклоняет лишнее поле в теле обмена", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const tokens = await sessionPairFor(ctxUser().email);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                {
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                    provider_token: "extra-field",
                },
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(400);
            expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            expect(sessionCookieHeaders(response)).toEqual([]);
        });
    }, 30_000);

    it("ротирует refresh: обмен выдаёт новую пару, и по ней сессия продолжается", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const tokens = await sessionPairFor(ctxUser().email);
            const exchange = await postJson(
                app.baseUrl,
                "/api/auth/oauth/exchange",
                { access_token: tokens.accessToken, refresh_token: tokens.refreshToken },
                mutationHeaders(pair, app.baseUrl)
            );
            const afterExchange = applyCookies(pair, exchange);
            const issuedRefresh = afterExchange[COOKIE_NAMES.refreshToken] ?? "";

            expect(exchange.status).toBe(200);
            // ARCHITECT: обмен выдаёт новую пару — refresh-кука не равна токену, пришедшему из танца.
            expect(issuedRefresh).not.toBe("");
            expect(issuedRefresh).not.toBe(tokens.refreshToken);

            // ARCHITECT: продолжение сессии идёт по выданной куке; что происходит со старым refresh-токеном,
            // решает GoTrue (локальный стек продолжает его принимать — см. отчёт), и это не наша логика.
            const refreshed = await postJson(
                app.baseUrl,
                "/api/auth/refresh",
                {},
                mutationHeaders(afterExchange, app.baseUrl)
            );

            expect(refreshed.status).toBe(200);
            expect(applyCookies(afterExchange, refreshed)[COOKIE_NAMES.refreshToken]).not.toBe(
                issuedRefresh
            );
        });
    }, 30_000);
});

describe("POST /api/auth/onboarding-complete", () => {
    it("отмечает завершение онбординга идемпотентно", async () => {
        await withAuthApp(async (app) => {
            const { id, jar } = await freshSession(app.baseUrl);

            expect(await dbOnboardingFlag(id)).toBeNull();

            const first = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(jar, app.baseUrl)
            );

            expect(first.status).toBe(200);
            expect(await first.json()).toEqual({ status: "ok" });

            const marked = await dbOnboardingFlag(id);

            expect(marked).not.toBeNull();

            // ARCHITECT: повтор обновляет 0 строк и всё равно 200, метка времени не переписывается.
            const second = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(jar, app.baseUrl)
            );

            expect(second.status).toBe(200);
            expect(await dbOnboardingFlag(id)).toBe(marked);
        });
    }, 30_000);

    it("поднимает флаг в /me и /login после отметки", async () => {
        await withAuthApp(async (app) => {
            const { email, jar } = await freshSession(app.baseUrl);
            const pair = await fetchCsrfPair(app.baseUrl);
            const fresh = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email, password: PASSWORD },
                mutationHeaders(pair, app.baseUrl)
            );
            const freshBody = (await fresh.json()) as { user: { onboardingCompleted: boolean } };

            expect(freshBody.user.onboardingCompleted).toBe(false);

            const complete = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(jar, app.baseUrl)
            );
            const me = await fetch(`${app.baseUrl}/api/auth/me`, {
                headers: { cookie: cookieHeader(jar) },
            });
            const meBody = (await me.json()) as { user: { onboardingCompleted: boolean } };
            const again = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email, password: PASSWORD },
                mutationHeaders(jar, app.baseUrl)
            );
            const againBody = (await again.json()) as { user: { onboardingCompleted: boolean } };

            expect(complete.status).toBe(200);
            expect(meBody.user.onboardingCompleted).toBe(true);
            expect(againBody.user.onboardingCompleted).toBe(true);
        });
    }, 30_000);

    it("отвечает 401 без access-куки", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(pair, app.baseUrl)
            );

            expect(response.status).toBe(401);
            expect(errorBody(await response.json()).error.code).toBe("UNAUTHORIZED");
        });
    }, 30_000);

    it("отвечает 401 на поддельный access-токен и не повторяет его", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const sentinel = "forged-token-sentinel";
            const response = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders({ ...pair, [COOKIE_NAMES.accessToken]: sentinel }, app.baseUrl)
            );
            const text = await response.text();

            expect(response.status).toBe(401);
            expect(errorBody(JSON.parse(text)).error.code).toBe("UNAUTHORIZED");
            // ARCHITECT: токен не возвращается клиенту ни в теле, ни в заголовках (§16.11).
            expect(text).not.toContain(sentinel);
        });
    }, 30_000);

    it("не принимает отметку без CSRF-пары", async () => {
        await withAuthApp(async (app) => {
            const { jar } = await freshSession(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                { cookie: cookieHeader(jar), origin: app.baseUrl }
            );

            // ARCHITECT: отметка — мутация: без парного заголовка 403, как у прочих мутаций auth-роутера.
            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
        });
    }, 30_000);

    it("отклоняет неизвестное поле тела и игнорирует клиентский userId", async () => {
        await withAuthApp(async (app) => {
            const { id, jar } = await freshSession(app.baseUrl);
            const foreignId = await createConfirmedUser(
                `${EMAIL_PREFIX}-victim-${randomUUID()}@example.test`
            );
            const response = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                { userId: foreignId },
                mutationHeaders(jar, app.baseUrl)
            );

            expect(response.status).toBe(400);
            expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            // ARCHITECT: чужой id из тела не применён, и своя строка тоже не отмечена — тело отклонено целиком.
            expect(await dbOnboardingFlag(foreignId)).toBeNull();
            expect(await dbOnboardingFlag(id)).toBeNull();
        });
    }, 30_000);

    it("не принимает onboardingCompleted в теле логина и регистрации", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const headers = mutationHeaders(pair, app.baseUrl);
            const email = `${EMAIL_PREFIX}-flag-${randomUUID()}@example.test`;
            const login = await postJson(
                app.baseUrl,
                "/api/auth/login",
                { email: ctxUser().email, password: PASSWORD, onboardingCompleted: true },
                headers
            );
            const signup = await postJson(
                app.baseUrl,
                "/api/auth/signup",
                { name: NAME, email, password: PASSWORD, onboardingCompleted: true },
                headers
            );

            expect(login.status).toBe(400);
            expect(signup.status).toBe(400);
            expect(await userExists(email)).toBe(false);
        });
    }, 30_000);

    it("не меняет чужой профиль при отметке своего", async () => {
        await withAuthApp(async (app) => {
            const mine = await freshSession(app.baseUrl);
            const foreignEmail = `${EMAIL_PREFIX}-cross-${randomUUID()}@example.test`;
            const foreignId = await createConfirmedUser(foreignEmail);
            const foreignJar = await loginSession(app.baseUrl, foreignEmail);
            const complete = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(mine.jar, app.baseUrl)
            );
            const foreignMe = await fetch(`${app.baseUrl}/api/auth/me`, {
                headers: { cookie: cookieHeader(foreignJar) },
            });
            const foreignBody = (await foreignMe.json()) as {
                user: { onboardingCompleted: boolean };
            };

            expect(complete.status).toBe(200);
            expect(foreignBody.user.onboardingCompleted).toBe(false);
            expect(await dbOnboardingFlag(foreignId)).toBeNull();
            expect(await dbOnboardingFlag(mine.id)).not.toBeNull();
        });
    }, 30_000);

    it("ограничивает отметку десятью вызовами за 15 минут", async () => {
        await withAuthApp(async (app) => {
            const { jar } = await freshSession(app.baseUrl);
            const headers = mutationHeaders(jar, app.baseUrl);
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const response = await postJson(
                    app.baseUrl,
                    "/api/auth/onboarding-complete",
                    {},
                    headers
                );

                attempted.push(response.status);
            }

            const limited = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                headers
            );

            expect(attempted).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 200]);
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
        });
    }, 60_000);

    it("отвечает безопасным конвертом без деталей провайдера", async () => {
        await withAuthApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/auth/onboarding-complete",
                {},
                mutationHeaders(pair, app.baseUrl)
            );
            const text = await response.text();
            const body = errorBody(JSON.parse(text));

            expect(response.status).toBe(401);
            expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
            expect(text).not.toContain("stack");
            expect(text).not.toContain("profiles");
            expect(text).not.toContain("PostgREST");
        });
    }, 30_000);
});

describe("RLS колонки onboarding_completed_at", () => {
    it("запрещает пользователю писать флаг, но читает только свою строку", async () => {
        const email = `${EMAIL_PREFIX}-rls-${randomUUID()}@example.test`;
        const id = await createConfirmedUser(email);
        const tokens = await sessionPairFor(email);
        const user = createUserClient(tokens.accessToken);
        const foreignId = await createConfirmedUser(
            `${EMAIL_PREFIX}-rls-foreign-${randomUUID()}@example.test`
        );

        const written = await user
            .from("profiles")
            .update({ onboarding_completed_at: new Date().toISOString() })
            .eq("id", id)
            .select("id");
        const own = await user.from("profiles").select("onboarding_completed_at").eq("id", id);
        const foreign = await user
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", foreignId);
        const anonymous = await createAnonClient()
            .from("profiles")
            .select("onboarding_completed_at");

        // ARCHITECT: колонка вне колоночного гранта update — прямая запись из браузера отвергается (§16.5).
        expect(written.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(own.error).toBeNull();
        expect(own.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 30_000);
});

describe("GET /api/auth/providers", () => {
    it("отдаёт включённые провайдеры из конфигурации и разрешает кэш", async () => {
        await withConfiguredApp({ AUTH_OAUTH_PROVIDERS: ["google", "apple"] }, async (app) => {
            const response = await fetch(`${app.baseUrl}/api/auth/providers`);
            const body = (await response.json()) as { providers: string[] };

            expect(response.status).toBe(200);
            expect(body.providers).toEqual(["google", "apple"]);
            // ARCHITECT: список читается при каждом открытии формы входа, а меняется вместе с конфигурацией
            // деплоя — ответ кэшируется на клиенте и на CDN.
            expect(response.headers.get("cache-control")).toContain("max-age=");
        });
    }, 30_000);

    it("без настроенных провайдеров отдаёт пустой список, а не все подряд", async () => {
        await withConfiguredApp({ AUTH_OAUTH_PROVIDERS: [] }, async (app) => {
            const response = await fetch(`${app.baseUrl}/api/auth/providers`);
            const body = (await response.json()) as { providers: string[] };

            // ARCHITECT: fail-closed: не подтверждённый конфигурацией провайдер не показывается (§16.2).
            expect(response.status).toBe(200);
            expect(body.providers).toEqual([]);
        });
    }, 30_000);

    it("не раскрывает ключи, адрес Supabase и не ставит кук", async () => {
        await withConfiguredApp({ AUTH_OAUTH_PROVIDERS: ["google"] }, async (app) => {
            const response = await fetch(`${app.baseUrl}/api/auth/providers`);
            const text = await response.text();
            const body = JSON.parse(text) as Record<string, unknown>;

            expect(Object.keys(body)).toEqual(["providers"]);
            expect(text).not.toContain(ctxEnv().SUPABASE_SECRET_KEY);
            expect(text).not.toContain(ctxEnv().SUPABASE_URL);
            // ARCHITECT: публичное чтение конфигурации не выдаёт сессию и не трогает её куки (§16.11).
            expect(response.headers.getSetCookie()).toEqual([]);
        });
    }, 30_000);
});
