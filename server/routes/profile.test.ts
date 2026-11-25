// ARCHITECT: доменный роутер чтения проверяется по реальному HTTP на локальном стеке Supabase: каждый тест
// поднимает своё приложение (лимиты в памяти экземпляра не перетекают в соседние проверки), окружение не
// переключаем — как в server/routes/auth.test.ts. Негативные проверки обязательны: аноним, подделка, IDOR,
// лимит, отсутствие строки и безопасный конверт.
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

interface ProfileBody {
    readonly profile: {
        readonly displayName: string;
        readonly locale: string;
        readonly dailyMinutes: number;
        readonly memberSince: string;
        readonly onboardingCompleted: boolean;
        readonly avatarUrl: string | null;
        readonly providerAvatarUrl: string | null;
    };
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `profile-${randomUUID()}`;
const PASSWORD = `Profile-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";
/** Код Postgres «недостаточно прав»: у anon нет select-гранта на profiles. */
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

/** Пользователь, созданный админ-клиентом в beforeAll: на нём проверяется позитивное чтение. */
function ctxUser(): { readonly id: string; readonly email: string } {
    if (userId === undefined || userEmail === undefined)
        throw new Error("тестовый пользователь не создан");

    return { id: userId, email: userEmail };
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

function patchJson(
    baseUrl: string,
    path: string,
    body: unknown,
    headers: Record<string, string>
): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

function deleteJson(
    baseUrl: string,
    path: string,
    headers: Record<string, string>,
    body?: unknown
): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
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

/** Имя профиля задаётся админ-клиентом: чужой строке ставим отдельное имя, чтобы поймать утечку. */
async function setDisplayName(id: string, name: string): Promise<void> {
    const { error } = await createAdminClient()
        .from("profiles")
        .update({ display_name: name })
        .eq("id", id);

    if (error !== null) throw error;
}

/** Строка профиля из БД сервисным клиентом: сверка ответа маршрута с источником правды (§16.5, RLS обходится). */
async function dbProfile(id: string): Promise<{
    display_name: string;
    locale: string;
    daily_minutes: number;
    created_at: string;
    onboarding_completed_at: string | null;
}> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("display_name, locale, daily_minutes, created_at, onboarding_completed_at")
        .eq("id", id)
        .maybeSingle();

    if (error !== null) throw error;
    if (data === null) throw new Error("строка профиля тестового пользователя не создана");

    return data;
}

/** PNG-фикстура реального размера: сигнатура, IHDR со сторонами и IDAT-набивка заданного веса. */
function pngDataUrl(width: number, height: number, paddingBytes: number): string {
    const u32 = (value: number): Buffer => {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value, 0);

        return buffer;
    };
    const chunk = (type: string, data: Buffer): Buffer =>
        Buffer.concat([u32(data.length), Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const header = chunk(
        "IHDR",
        Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])
    );
    const data = chunk("IDAT", Buffer.alloc(paddingBytes, 0x42));

    return `data:image/png;base64,${Buffer.concat([signature, header, data]).toString("base64")}`;
}

/** Текущий avatar_path из БД: отдельный запрос, потому что dbProfile читает другой набор колонок. */
async function avatarPathOf(userId: string): Promise<string | null> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("avatar_path")
        .eq("id", userId)
        .single();

    if (error !== null) throw error;

    return data.avatar_path;
}

/** Имена объектов в «папке» пользователя внутри бакета avatars. */
async function avatarNames(userId: string): Promise<string[]> {
    const { data, error } = await createAdminClient().storage.from("avatars").list(userId);

    if (error !== null) throw error;

    return (data ?? []).map((item) => item.name);
}

/** Убирает объекты тестового пользователя: прогон не должен оставлять мусор в бакете. */
async function clearAvatars(userId: string): Promise<void> {
    const names = await avatarNames(userId);

    if (names.length === 0) return;

    await createAdminClient()
        .storage.from("avatars")
        .remove(names.map((name) => `${userId}/${name}`));
}

/** Свежий аккаунт (триггер оставляет дефолты, флаг null) и его сессия: каждый тест изолирован своим юзером. */
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

describe("GET /api/profile", () => {
    it("отдаёт только DTO профиля по access-куке и совпадает с БД", async () => {
        await withApp(async (app) => {
            const jar = await loginSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(jar) },
            });
            const body = (await response.json()) as ProfileBody;
            const db = await dbProfile(ctxUser().id);

            expect(response.status).toBe(200);
            // ARCHITECT: наружу уходят только поля DTO: ни email, ни id, ни updated_at.
            expect(Object.keys(body.profile).sort()).toEqual([
                "avatarUrl",
                "dailyMinutes",
                "displayName",
                "locale",
                "memberSince",
                "onboardingCompleted",
                "providerAvatarUrl",
            ]);
            // ARCHITECT: свежий аккаунт получает дефолты строки profiles и null-флаг онбординга.
            expect(body.profile).toEqual({
                displayName: "",
                locale: "ru",
                dailyMinutes: 20,
                memberSince: db.created_at,
                onboardingCompleted: false,
                avatarUrl: null,
                providerAvatarUrl: null,
            });
        });
    }, 30_000);

    it("отвечает 401 без access-куки", async () => {
        await withApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/profile`);
            const body = errorBody(await response.json());

            expect(response.status).toBe(401);
            expect(body.error.code).toBe("UNAUTHORIZED");
        });
    }, 30_000);

    it("отвечает 401 на поддельную куку тем же телом, что без куки", async () => {
        await withApp(async (app) => {
            const sentinel = "fake-token-sentinel";
            const anonymous = await fetch(`${app.baseUrl}/api/profile`);
            const anonymousBody = errorBody(await anonymous.json());
            const forged = await fetch(`${app.baseUrl}/api/profile`, {
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

    it("читает только свою строку: два пользователя с разными именами", async () => {
        await withApp(async (app) => {
            const aliceEmail = `${EMAIL_PREFIX}-alice-${randomUUID()}@example.test`;
            const bobEmail = `${EMAIL_PREFIX}-bob-${randomUUID()}@example.test`;
            const aliceId = await createConfirmedUser(aliceEmail);
            const bobId = await createConfirmedUser(bobEmail);

            await setDisplayName(aliceId, "Alice");
            await setDisplayName(bobId, "Bob");

            const aliceJar = await loginSession(app.baseUrl, aliceEmail);
            const bobJar = await loginSession(app.baseUrl, bobEmail);

            const alice = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(aliceJar) },
            });
            const bob = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(bobJar) },
            });

            expect(((await alice.json()) as ProfileBody).profile.displayName).toBe("Alice");
            expect(((await bob.json()) as ProfileBody).profile.displayName).toBe("Bob");
        });
    }, 30_000);

    it("игнорирует клиентский id в query: читает только свою строку", async () => {
        await withApp(async (app) => {
            const aliceEmail = `${EMAIL_PREFIX}-idor-alice-${randomUUID()}@example.test`;
            const bobEmail = `${EMAIL_PREFIX}-idor-bob-${randomUUID()}@example.test`;
            const aliceId = await createConfirmedUser(aliceEmail);
            const bobId = await createConfirmedUser(bobEmail);

            await setDisplayName(aliceId, "Alice");
            await setDisplayName(bobId, "Bob");

            const jar = await loginSession(app.baseUrl, aliceEmail);
            const headers = { cookie: cookieHeader(jar) };

            const byId = await fetch(`${app.baseUrl}/api/profile?id=${bobId}`, { headers });
            const byUserId = await fetch(`${app.baseUrl}/api/profile?userId=${bobId}`, { headers });

            // ARCHITECT: userId берётся только из проверенного токена — чужой id из query не принимается (§16.2).
            expect(byId.status).toBe(200);
            expect(((await byId.json()) as ProfileBody).profile.displayName).toBe("Alice");
            expect(byUserId.status).toBe(200);
            expect(((await byUserId.json()) as ProfileBody).profile.displayName).toBe("Alice");
        });
    }, 30_000);

    it("ограничивает чтение шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const { jar } = await freshSession(app.baseUrl);
            const headers = { cookie: cookieHeader(jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/profile`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/profile`, { headers });

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);

    it("отвечает 404, когда строки профиля нет", async () => {
        await withApp(async (app) => {
            const email = `${EMAIL_PREFIX}-orphan-${randomUUID()}@example.test`;
            const id = await createConfirmedUser(email);
            const jar = await loginSession(app.baseUrl, email);

            const removed = await createAdminClient().from("profiles").delete().eq("id", id);

            expect(removed.error).toBeNull();

            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(jar) },
            });

            expect(response.status).toBe(404);
            expect(errorBody(await response.json()).error.code).toBe("NOT_FOUND");
        });
    }, 30_000);

    it("отвечает безопасным конвертом без деталей провайдера", async () => {
        await withApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/profile`);
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

describe("RLS таблицы profiles", () => {
    it("читает только свою строку, чужую не видит, анониму отказывает", async () => {
        const mineEmail = `${EMAIL_PREFIX}-rls-mine-${randomUUID()}@example.test`;
        const foreignEmail = `${EMAIL_PREFIX}-rls-foreign-${randomUUID()}@example.test`;
        const mineId = await createConfirmedUser(mineEmail);
        const foreignId = await createConfirmedUser(foreignEmail);
        const tokens = await sessionPairFor(mineEmail);
        const user = createUserClient(tokens.accessToken);

        const own = await user.from("profiles").select("display_name").eq("id", mineId);
        const foreign = await user.from("profiles").select("display_name").eq("id", foreignId);
        const anonymous = await createAnonClient().from("profiles").select("display_name");

        // ARCHITECT: политика select-own отдаёт только строку с id = auth.uid(); у anon нет select-гранта (§16.5).
        expect(own.error).toBeNull();
        expect(own.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 30_000);
});
describe("PATCH /api/profile", () => {
    it("3.1 частичное обновление: меняется только переданное поле, остальные целы", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbProfile(me.id);
            const response = await patchJson(
                app.baseUrl,
                "/api/profile",
                { dailyMinutes: 45 },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as ProfileBody;
            const after = await dbProfile(me.id);

            expect(response.status).toBe(200);
            expect(body.profile.dailyMinutes).toBe(45);
            expect(body.profile.displayName).toBe(before.display_name);
            expect(body.profile.locale).toBe(before.locale);
            expect(body.profile.memberSince).toBe(before.created_at);
            expect(body.profile.onboardingCompleted).toBe(false);
            expect(after.daily_minutes).toBe(45);
            expect(after.display_name).toBe(before.display_name);
            expect(after.locale).toBe(before.locale);
        });
    }, 30_000);

    it("3.2 обновление имени и локали: DTO равен БД, остальные поля целы", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbProfile(me.id);
            const response = await patchJson(
                app.baseUrl,
                "/api/profile",
                { displayName: "Алекс", locale: "en" },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as ProfileBody;
            const after = await dbProfile(me.id);

            expect(response.status).toBe(200);
            expect(after.display_name).toBe("Алекс");
            expect(after.locale).toBe("en");
            expect(after.daily_minutes).toBe(before.daily_minutes);
            expect(body.profile).toEqual({
                displayName: after.display_name,
                locale: after.locale,
                dailyMinutes: after.daily_minutes,
                memberSince: after.created_at,
                onboardingCompleted: after.onboarding_completed_at !== null,
            });
            expect(Object.keys(body.profile).sort()).toEqual([
                "dailyMinutes",
                "displayName",
                "locale",
                "memberSince",
                "onboardingCompleted",
            ]);
        });
    }, 30_000);

    it("3.3 отклоняет 400: вне допустимых значений, служебные поля и пустое тело", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const before = await dbProfile(me.id);
            const invalidBodies: readonly unknown[] = [
                { locale: "xx" },
                { dailyMinutes: 4 },
                { dailyMinutes: 121 },
                { displayName: "x".repeat(81) },
                // ARCHITECT: id/userId/служебные колонки приходят не от клиента — strictObject их отклоняет.
                { id: "a1b2c3d4-0001-4000-8000-000000000001" },
                { userId: "a1b2c3d4-0001-4000-8000-000000000001" },
                { createdAt: "2026-11-18T10:00:00.000Z" },
                { onboardingCompletedAt: null },
                {},
            ];

            for (const body of invalidBodies) {
                const response = await patchJson(app.baseUrl, "/api/profile", body, headers);

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            expect(await dbProfile(me.id)).toEqual(before);
        });
    }, 30_000);

    it("3.4 отвечает 401 без куки и на поддельный токен, не светя его", async () => {
        await withApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const sentinel = "forged-profile-token-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
            const body = { dailyMinutes: 30 };

            try {
                const anonymous = await patchJson(
                    app.baseUrl,
                    "/api/profile",
                    body,
                    mutationHeaders(pair, app.baseUrl)
                );
                const anonymousBody = errorBody(await anonymous.json());
                const forgedJar = { ...pair, [COOKIE_NAMES.accessToken]: sentinel };
                const forged = await patchJson(
                    app.baseUrl,
                    "/api/profile",
                    body,
                    mutationHeaders(forgedJar, app.baseUrl)
                );
                const forgedText = await forged.text();
                const forgedBody = errorBody(JSON.parse(forgedText));

                expect(anonymous.status).toBe(401);
                expect(forged.status).toBe(401);
                expect(forgedBody.error.code).toBe(anonymousBody.error.code);
                expect(forgedBody.error.message).toBe(anonymousBody.error.message);
                expect(forgedText).not.toContain(sentinel);
                expect(JSON.stringify([...forged.headers.entries()])).not.toContain(sentinel);
                expect(errorSpy.mock.calls.flat().map(String).join("\n")).not.toContain(sentinel);
            } finally {
                errorSpy.mockRestore();
            }
        });
    }, 30_000);
    it("3.5 отвечает 403 без CSRF-пары и не меняет строку", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbProfile(me.id);
            const response = await patchJson(
                app.baseUrl,
                "/api/profile",
                { dailyMinutes: 90 },
                { cookie: cookieHeader(me.jar), origin: app.baseUrl }
            );
            const text = await response.text();

            expect(response.status).toBe(403);
            expect(errorBody(JSON.parse(text)).error.code).toBe("FORBIDDEN");
            expect(await dbProfile(me.id)).toEqual(before);
        });
    }, 30_000);

    it("3.6 чужой id в теле отсекается, чужая строка не меняется", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const bobBefore = await dbProfile(bob.id);
            const tampered = await patchJson(
                app.baseUrl,
                "/api/profile",
                { id: bob.id, displayName: "Взлом" },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(tampered.status).toBe(400);
            expect(await dbProfile(bob.id)).toEqual(bobBefore);

            const own = await patchJson(
                app.baseUrl,
                "/api/profile",
                { displayName: "Алиса" },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(own.status).toBe(200);
            expect((await dbProfile(alice.id)).display_name).toBe("Алиса");
            expect((await dbProfile(bob.id)).display_name).toBe(bobBefore.display_name);
        });
    }, 30_000);

    it("3.7 ограничивает обновление двадцатью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 20; attempt += 1) {
                const response = await patchJson(
                    app.baseUrl,
                    "/api/profile",
                    { dailyMinutes: 20 + attempt },
                    headers
                );

                attempted.push(response.status);
            }

            const limited = await patchJson(
                app.baseUrl,
                "/api/profile",
                { dailyMinutes: 60 },
                headers
            );
            const limitedText = await limited.text();

            expect(attempted).toEqual(Array.from({ length: 20 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(JSON.parse(limitedText)).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);
});
describe("POST /api/profile/avatar", () => {
    it("6.1 загружает PNG реального размера: ключ в профиле и объект в бакете", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const image = pngDataUrl(512, 512, 65_536);
            const response = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as { avatarPath: string };
            const name = body.avatarPath.slice(me.id.length + 1);

            expect(response.status).toBe(200);
            expect(body.avatarPath.startsWith(`${me.id}/`)).toBe(true);
            expect(body.avatarPath.endsWith(".png")).toBe(true);
            expect(await avatarPathOf(me.id)).toBe(body.avatarPath);
            expect(await avatarNames(me.id)).toEqual([name]);

            await clearAvatars(me.id);
        });
    }, 60_000);

    it("6.2 повторная загрузка: новый ключ, прежний объект удалён, в профиле новый путь", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const first = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(512, 512, 65_536) },
                headers
            );
            const firstBody = (await first.json()) as { avatarPath: string };
            const second = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 70_000) },
                headers
            );
            const secondBody = (await second.json()) as { avatarPath: string };
            const names = await avatarNames(me.id);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(secondBody.avatarPath).not.toBe(firstBody.avatarPath);
            expect(await avatarPathOf(me.id)).toBe(secondBody.avatarPath);
            expect(names).toEqual([secondBody.avatarPath.slice(me.id.length + 1)]);

            await clearAvatars(me.id);
        });
    }, 60_000);

    it("6.3 отклоняет 400: невалидный data URL, webp, магия не та, лишнее поле", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const validPng = pngDataUrl(256, 256, 65_536);
            const invalidBodies: readonly unknown[] = [
                { image: "hello" },
                { image: validPng.replace("image/png", "image/webp") },
                // ARCHITECT: заявлен JPEG, содержимое PNG — магия обязана совпасть с MIME.
                { image: validPng.replace("image/png", "image/jpeg") },
                { image: validPng, userId: bob.id },
            ];

            for (const body of invalidBodies) {
                const response = await postJson(app.baseUrl, "/api/profile/avatar", body, headers);

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            expect(await avatarPathOf(me.id)).toBeNull();
            expect(await avatarNames(me.id)).toEqual([]);
        });
    }, 60_000);
    it("6.4 отвечает 401 без куки и на поддельный токен, не светя его", async () => {
        await withApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const sentinel = "forged-avatar-token-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
            const body = { image: pngDataUrl(256, 256, 65_536) };

            try {
                const anonymous = await postJson(
                    app.baseUrl,
                    "/api/profile/avatar",
                    body,
                    mutationHeaders(pair, app.baseUrl)
                );
                const anonymousBody = errorBody(await anonymous.json());
                const forgedJar = { ...pair, [COOKIE_NAMES.accessToken]: sentinel };
                const forged = await postJson(
                    app.baseUrl,
                    "/api/profile/avatar",
                    body,
                    mutationHeaders(forgedJar, app.baseUrl)
                );
                const forgedText = await forged.text();

                expect(anonymous.status).toBe(401);
                expect(forged.status).toBe(401);
                expect(errorBody(JSON.parse(forgedText)).error.code).toBe(anonymousBody.error.code);
                expect(forgedText).not.toContain(sentinel);
                expect(JSON.stringify([...forged.headers.entries()])).not.toContain(sentinel);
                expect(errorSpy.mock.calls.flat().map(String).join("\n")).not.toContain(sentinel);
            } finally {
                errorSpy.mockRestore();
            }
        });
    }, 60_000);

    it("6.5 отвечает 403 без CSRF-пары: профиль цел, объектов не добавилось", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                { cookie: cookieHeader(me.jar), origin: app.baseUrl }
            );

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(await avatarPathOf(me.id)).toBeNull();
            expect(await avatarNames(me.id)).toEqual([]);
        });
    }, 60_000);

    it("6.6 чужой userId в теле отсекается, ключ принадлежит владельцу токена", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const tampered = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536), userId: bob.id },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(tampered.status).toBe(400);
            expect(await avatarPathOf(bob.id)).toBeNull();

            const own = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                mutationHeaders(alice.jar, app.baseUrl)
            );
            const ownBody = (await own.json()) as { avatarPath: string };

            expect(own.status).toBe(200);
            expect(ownBody.avatarPath.startsWith(`${alice.id}/`)).toBe(true);
            expect(await avatarPathOf(bob.id)).toBeNull();

            await clearAvatars(alice.id);
        });
    }, 60_000);
    it("6.7 ограничивает загрузку десятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const image = pngDataUrl(256, 256, 65_536);
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const response = await postJson(
                    app.baseUrl,
                    "/api/profile/avatar",
                    { image },
                    headers
                );

                attempted.push(response.status);
            }

            const limited = await postJson(app.baseUrl, "/api/profile/avatar", { image }, headers);
            const limitedText = await limited.text();

            expect(attempted).toEqual(Array.from({ length: 10 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(JSON.parse(limitedText)).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();

            await clearAvatars(me.id);
        });
    }, 120_000);

    it("6.8 тело больше 400kb на аватаре: 413 PAYLOAD_TOO_LARGE", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: `data:image/png;base64,${"A".repeat(420_000)}` },
                mutationHeaders(me.jar, app.baseUrl)
            );

            expect(response.status).toBe(413);
            expect(errorBody(await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
            expect(await avatarPathOf(me.id)).toBeNull();
        });
    }, 60_000);

    it("6.9 регресс: PATCH под глобальным лимитом 16kb — больше лимита даёт 413", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbProfile(me.id);
            const response = await patchJson(
                app.baseUrl,
                "/api/profile",
                { displayName: "x".repeat(20_000) },
                mutationHeaders(me.jar, app.baseUrl)
            );

            expect(response.status).toBe(413);
            expect(errorBody(await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
            expect(await dbProfile(me.id)).toEqual(before);
        });
    }, 60_000);
});
describe("DELETE /api/profile/avatar", () => {
    it("3.1 удаляет аватар: профиль без пути, объект удалён из бакета", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const uploaded = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(512, 512, 65_536) },
                headers
            );

            expect(uploaded.status).toBe(200);

            const response = await deleteJson(app.baseUrl, "/api/profile/avatar", headers);
            const body = (await response.json()) as { avatarPath: null };

            expect(response.status).toBe(200);
            expect(body).toEqual({ avatarPath: null });
            expect(await avatarPathOf(me.id)).toBeNull();
            expect(await avatarNames(me.id)).toEqual([]);
        });
    }, 60_000);

    it("3.2 идемпотентность: DELETE без аватара отвечает 200 и ничего не удаляет", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await deleteJson(
                app.baseUrl,
                "/api/profile/avatar",
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as { avatarPath: null };

            expect(response.status).toBe(200);
            expect(body).toEqual({ avatarPath: null });
            expect(await avatarPathOf(me.id)).toBeNull();
            expect(await avatarNames(me.id)).toEqual([]);
        });
    }, 60_000);

    it("3.3 отвечает 401 без куки и на поддельный токен, не светя его", async () => {
        await withApp(async (app) => {
            const pair = await fetchCsrfPair(app.baseUrl);
            const sentinel = "forged-avatar-delete-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            try {
                const anonymous = await deleteJson(
                    app.baseUrl,
                    "/api/profile/avatar",
                    mutationHeaders(pair, app.baseUrl)
                );
                const anonymousBody = errorBody(await anonymous.json());
                const forgedJar = { ...pair, [COOKIE_NAMES.accessToken]: sentinel };
                const forged = await deleteJson(
                    app.baseUrl,
                    "/api/profile/avatar",
                    mutationHeaders(forgedJar, app.baseUrl)
                );
                const forgedText = await forged.text();

                expect(anonymous.status).toBe(401);
                expect(forged.status).toBe(401);
                expect(errorBody(JSON.parse(forgedText)).error.code).toBe(anonymousBody.error.code);
                expect(forgedText).not.toContain(sentinel);
                expect(JSON.stringify([...forged.headers.entries()])).not.toContain(sentinel);
                expect(errorSpy.mock.calls.flat().map(String).join("\n")).not.toContain(sentinel);
            } finally {
                errorSpy.mockRestore();
            }
        });
    }, 60_000);

    it("3.4 отвечает 403 без CSRF-пары: путь и объект целы", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const uploaded = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                headers
            );
            const uploadedBody = (await uploaded.json()) as { avatarPath: string };
            const response = await deleteJson(app.baseUrl, "/api/profile/avatar", {
                cookie: cookieHeader(me.jar),
                origin: app.baseUrl,
            });

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(await avatarPathOf(me.id)).toBe(uploadedBody.avatarPath);
            expect(await avatarNames(me.id)).toHaveLength(1);

            await clearAvatars(me.id);
        });
    }, 60_000);

    it("3.5 тело игнорируется: чужой userId не трогает аватар второго пользователя", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const aliceHeaders = mutationHeaders(alice.jar, app.baseUrl);
            const bobHeaders = mutationHeaders(bob.jar, app.baseUrl);
            const aliceUpload = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                aliceHeaders
            );
            const bobUpload = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                bobHeaders
            );
            const alicePath = ((await aliceUpload.json()) as { avatarPath: string }).avatarPath;
            const bobPath = ((await bobUpload.json()) as { avatarPath: string }).avatarPath;

            const response = await deleteJson(app.baseUrl, "/api/profile/avatar", aliceHeaders, {
                userId: bob.id,
            });

            expect(response.status).toBe(200);
            expect(await avatarPathOf(alice.id)).toBeNull();
            expect(await avatarPathOf(bob.id)).toBe(bobPath);
            expect(await avatarNames(bob.id)).toEqual([bobPath.slice(bob.id.length + 1)]);
            expect(await avatarNames(alice.id)).toEqual([]);

            await clearAvatars(bob.id);
            expect(alicePath).not.toBe(bobPath);
        });
    }, 60_000);
});
/** Обновляет user_metadata пользователя: так проверяется валидация картинки провайдера на границе токена. */
async function setProviderAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
        user_metadata: { avatar_url: avatarUrl },
    });

    if (error !== null) throw error;
}

describe("GET /api/profile: аватар", () => {
    it("4.1 без аватара: avatarUrl и providerAvatarUrl равны null", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as ProfileBody;

            expect(response.status).toBe(200);
            expect(body.profile.avatarUrl).toBeNull();
            expect(body.profile.providerAvatarUrl).toBeNull();
        });
    }, 30_000);

    it("4.2 после загрузки: avatarUrl подписан, ссылка отдаёт картинку", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const uploaded = await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const uploadedBody = (await uploaded.json()) as { avatarPath: string };
            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as ProfileBody;
            const avatarUrl = body.profile.avatarUrl;

            expect(response.status).toBe(200);
            expect(avatarUrl).not.toBeNull();

            if (avatarUrl === null) throw new Error("avatarUrl не подписан");

            expect(avatarUrl).toContain(uploadedBody.avatarPath);

            const image = await fetch(avatarUrl);

            expect(image.status).toBe(200);
            expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(0);

            await clearAvatars(me.id);
        });
    }, 60_000);

    it("4.3 чужой префикс в avatar_path: avatarUrl null, остальной профиль цел", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const updated = await createAdminClient()
                .from("profiles")
                .update({ avatar_path: `${bob.id}/stolen.png` })
                .eq("id", alice.id);

            expect(updated.error).toBeNull();

            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const body = (await response.json()) as ProfileBody;

            expect(response.status).toBe(200);
            expect(body.profile.avatarUrl).toBeNull();
            expect(body.profile.displayName).toBe("");
            expect(body.profile.locale).toBe("ru");
            expect(body.profile.dailyMinutes).toBe(20);
        });
    }, 30_000);
    it("4.4 Google-картинка проходит allowlist и отдаётся в providerAvatarUrl", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const providerUrl = "https://lh3.googleusercontent.com/a/test-avatar";

            await setProviderAvatar(me.id, providerUrl);
            // ARCHITECT: новая сессия — новый токен, поэтому verifyAccessToken читает свежие metadata.
            const jar = await loginSession(app.baseUrl, me.email);
            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(jar) },
            });
            const body = (await response.json()) as ProfileBody;

            expect(response.status).toBe(200);
            expect(body.profile.providerAvatarUrl).toBe(providerUrl);
        });
    }, 30_000);

    it("4.5 невалидный провайдерский URL: http, чужой хост, javascript и мусор дают null", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const invalidUrls = [
                "http://lh3.googleusercontent.com/a/test-avatar",
                "https://evil.example.test/a/test-avatar",
                "javascript:alert(1)",
                "not a url",
            ];

            for (const invalidUrl of invalidUrls) {
                await setProviderAvatar(me.id, invalidUrl);
                const jar = await loginSession(app.baseUrl, me.email);
                const response = await fetch(`${app.baseUrl}/api/profile`, {
                    headers: { cookie: cookieHeader(jar) },
                });
                const body = (await response.json()) as ProfileBody;

                expect(response.status).toBe(200);
                expect(body.profile.providerAvatarUrl).toBeNull();
            }
        });
    }, 60_000);

    it("4.6 после DELETE avatarUrl снова null", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);

            await postJson(
                app.baseUrl,
                "/api/profile/avatar",
                { image: pngDataUrl(256, 256, 65_536) },
                headers
            );
            await deleteJson(app.baseUrl, "/api/profile/avatar", headers);

            const response = await fetch(`${app.baseUrl}/api/profile`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as ProfileBody;

            expect(response.status).toBe(200);
            expect(body.profile.avatarUrl).toBeNull();
            expect(await avatarNames(me.id)).toEqual([]);
        });
    }, 60_000);
});
