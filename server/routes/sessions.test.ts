// ARCHITECT: доменный роутер чтения сессий проверяется по реальному HTTP на локальном стеке Supabase:
// каждый тест поднимает своё приложение (лимиты в памяти экземпляра не перетекают в соседние проверки) и
// свой аккаунт. Негативные проверки обязательны: аноним, подделка, IDOR, лимит, пустой список, прямой RLS.
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

interface SessionDto {
    readonly id: string;
    readonly tutorId: string;
    readonly mode: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

interface SessionListBody {
    readonly sessions: readonly SessionDto[];
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `sessions-${randomUUID()}`;
const PASSWORD = `Sessions-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";
/** Код Postgres «недостаточно прав»: у anon нет select-гранта на sessions. */
const INSUFFICIENT_PRIVILEGE = "42501";
const TUTOR_ID = "miya";
const MODE = "speaking";

let env: SupabaseEnv | undefined;

/** Отдаёт окружение стека и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctxEnv(): SupabaseEnv {
    if (env === undefined)
        throw new Error("local Supabase stack is not running: run npx supabase start");

    return env;
}

/** Поднимает приложение на случайном порту и возвращает адрес для запросов. */
async function startApp(): Promise<RunningApp> {
    const server = buildApp(undefined, ctxEnv()).listen(0);
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
async function withApp(run: (app: RunningApp) => Promise<void>): Promise<void> {
    const running = await startApp();

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
async function loginSession(baseUrl: string, email: string): Promise<Jar> {
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

/** Пара токенов прямо из GoTrue: для прямых RLS-проверок пользовательским клиентом. */
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

/** Свежий аккаунт и его сессия в куках: каждый тест изолирован своим пользователем. */
async function freshUser(
    baseUrl: string
): Promise<{ readonly id: string; readonly email: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-u-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email);

    return { id, email, jar: await loginSession(baseUrl, email) };
}

/** Создаёт строку sessions сервисным клиентом: insert-грантов у authenticated нет (§16.5). */
async function insertSession(
    userId: string,
    createdAt: string,
    options: { tutorId?: string; mode?: string } = {}
): Promise<string> {
    const { data, error } = await createAdminClient()
        .from("sessions")
        .insert({
            user_id: userId,
            tutor_id: options.tutorId ?? TUTOR_ID,
            mode: options.mode ?? MODE,
            created_at: createdAt,
        })
        .select("id")
        .single();

    if (error !== null) throw error;

    return data.id;
}

/** Ожидаемый DTO из БД сервисным клиентом тем же порядком, что отдаёт маршрут: источник правды (§16.5). */
async function dbSessions(userId: string): Promise<SessionDto[]> {
    const { data, error } = await createAdminClient()
        .from("sessions")
        .select("id, user_id, tutor_id, mode, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);

    if (error !== null) throw error;

    return data.map((row) => ({
        id: row.id,
        tutorId: row.tutor_id,
        mode: row.mode,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }));
}

beforeAll(() => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };
});

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

describe("GET /api/sessions", () => {
    it("3.1 отдаёт свои сессии порядком created_at desc, id desc, без названия и user_id", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            await insertSession(me.id, "2026-11-18T10:00:00.000Z");
            await insertSession(me.id, "2026-11-19T09:30:00.000Z");
            // равный created_at: пара проверяет вторичный ключ id desc
            await insertSession(me.id, "2026-11-18T10:00:00.000Z");
            await insertSession(me.id, "2026-11-17T12:00:00.000Z", { mode: "grammar" });

            const response = await fetch(`${app.baseUrl}/api/sessions`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as SessionListBody;
            const expected = await dbSessions(me.id);

            expect(response.status).toBe(200);
            expect(body.sessions).toHaveLength(4);
            // ARCHITECT: PostgREST отдаёт timestamptz как «+00:00», поэтому порядок сверяем по инстантам.
            expect(body.sessions.map((session) => Date.parse(session.createdAt))).toEqual([
                Date.parse("2026-11-19T09:30:00.000Z"),
                Date.parse("2026-11-18T10:00:00.000Z"),
                Date.parse("2026-11-18T10:00:00.000Z"),
                Date.parse("2026-11-17T12:00:00.000Z"),
            ]);
            // при равном created_at uuid идёт по убыванию
            expect(body.sessions[1].id > body.sessions[2].id).toBe(true);
            expect(body.sessions[3].mode).toBe("grammar");
            // DTO совпадает с источником правды и не содержит названия/user_id
            expect(body.sessions).toEqual(expected);
            expect(Object.keys(body.sessions[0]).sort()).toEqual([
                "createdAt",
                "id",
                "mode",
                "tutorId",
                "updatedAt",
            ]);
        });
    }, 30_000);

    it("3.2 cross-user: каждый видит только свои сессии", async () => {
        await withApp(async (app) => {
            const alice = await freshUser(app.baseUrl);
            const bob = await freshUser(app.baseUrl);
            await insertSession(alice.id, "2026-11-18T10:00:00.000Z");
            await insertSession(bob.id, "2026-11-18T11:00:00.000Z");

            const aliceResponse = await fetch(`${app.baseUrl}/api/sessions`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const bobResponse = await fetch(`${app.baseUrl}/api/sessions`, {
                headers: { cookie: cookieHeader(bob.jar) },
            });
            const aliceBody = (await aliceResponse.json()) as SessionListBody;
            const bobBody = (await bobResponse.json()) as SessionListBody;

            expect(aliceBody.sessions).toEqual(await dbSessions(alice.id));
            expect(bobBody.sessions).toEqual(await dbSessions(bob.id));
            expect(aliceBody.sessions).toHaveLength(1);
            expect(bobBody.sessions).toHaveLength(1);
            expect(aliceBody.sessions[0].id).not.toBe(bobBody.sessions[0].id);
        });
    }, 30_000);

    it("3.3 отвечает 401 без access-куки безопасным конвертом", async () => {
        await withApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/sessions`);
            const text = await response.text();
            const body = errorBody(JSON.parse(text));

            expect(response.status).toBe(401);
            expect(body.error.code).toBe("UNAUTHORIZED");
            expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
            expect(text).not.toContain("stack");
            expect(text).not.toContain("tutor_id");
        });
    }, 30_000);

    it("3.4 отвечает 401 на поддельную куку тем же телом, что без куки", async () => {
        await withApp(async (app) => {
            const sentinel = "forged-session-token-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            try {
                const anonymous = await fetch(`${app.baseUrl}/api/sessions`);
                const anonymousBody = errorBody(await anonymous.json());
                const forged = await fetch(`${app.baseUrl}/api/sessions`, {
                    headers: { cookie: `${COOKIE_NAMES.accessToken}=${sentinel}` },
                });
                const forgedText = await forged.text();
                const forgedBody = errorBody(JSON.parse(forgedText));

                expect(forged.status).toBe(401);
                expect(forgedBody.error.code).toBe(anonymousBody.error.code);
                expect(forgedBody.error.message).toBe(anonymousBody.error.message);
                // ARCHITECT: токен не возвращается клиенту ни в теле, ни в заголовках, ни в логах (§16.11).
                expect(forgedText).not.toContain(sentinel);
                expect(JSON.stringify([...forged.headers.entries()])).not.toContain(sentinel);
                expect(errorSpy.mock.calls.flat().map(String).join("\n")).not.toContain(sentinel);
            } finally {
                errorSpy.mockRestore();
            }
        });
    }, 30_000);

    it("3.5 игнорирует клиентские ?userId и ?id: возвращает только свои сессии", async () => {
        await withApp(async (app) => {
            const alice = await freshUser(app.baseUrl);
            const bob = await freshUser(app.baseUrl);
            const aliceSessionId = await insertSession(alice.id, "2026-11-18T10:00:00.000Z");
            await insertSession(bob.id, "2026-11-18T11:00:00.000Z");

            const byUserId = await fetch(`${app.baseUrl}/api/sessions?userId=${bob.id}`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const byId = await fetch(`${app.baseUrl}/api/sessions?id=${bob.id}`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const byUserIdBody = (await byUserId.json()) as SessionListBody;
            const byIdBody = (await byId.json()) as SessionListBody;

            expect(byUserId.status).toBe(200);
            expect(byId.status).toBe(200);
            expect(byUserIdBody.sessions).toEqual(await dbSessions(alice.id));
            expect(byIdBody.sessions).toEqual(await dbSessions(alice.id));
            expect(byUserIdBody.sessions.map((session) => session.id)).toEqual([aliceSessionId]);
        });
    }, 30_000);

    it("3.6 ограничивает чтение шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            await insertSession(me.id, "2026-11-18T10:00:00.000Z");
            const headers = { cookie: cookieHeader(me.jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/sessions`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/sessions`, { headers });
            const limitedText = await limited.text();

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(JSON.parse(limitedText)).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
            expect(limitedText).not.toContain("stack");
        });
    }, 60_000);

    it("3.7 пустой список отдаёт { sessions: [] }", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/sessions`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as SessionListBody;

            expect(response.status).toBe(200);
            expect(body).toEqual({ sessions: [] });
        });
    }, 30_000);
});

describe("RLS таблицы sessions", () => {
    it("3.8 своя выборка видна, чужая пуста, аноним получает 42501", async () => {
        const mineEmail = `${EMAIL_PREFIX}-rls-mine-${randomUUID()}@example.test`;
        const foreignEmail = `${EMAIL_PREFIX}-rls-foreign-${randomUUID()}@example.test`;
        const mineId = await createConfirmedUser(mineEmail);
        const foreignId = await createConfirmedUser(foreignEmail);
        await insertSession(mineId, "2026-11-18T10:00:00.000Z");
        await insertSession(foreignId, "2026-11-18T11:00:00.000Z");

        const tokens = await sessionPairFor(mineEmail);
        const user = createUserClient(tokens.accessToken);

        const own = await user.from("sessions").select("id").eq("user_id", mineId);
        const foreign = await user.from("sessions").select("id").eq("user_id", foreignId);
        const anonymous = await createAnonClient().from("sessions").select("id");

        // ARCHITECT: политика select-own отдаёт только строки с user_id = auth.uid(); у anon нет select-гранта (§16.5).
        expect(own.error).toBeNull();
        expect(own.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 30_000);
});
