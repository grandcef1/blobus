// ARCHITECT: настройки — второй доменный роутер с jsonb-колонкой: проверяется по реальному HTTP на локальном
// стеке Supabase. Каждый тест поднимает своё приложение (лимиты в памяти не перетекают), негативные проверки
// обязательны: аноним, CSRF, IDOR, лимит, невалидные тела и колоночный grant (§16.14).
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

interface SettingsBody {
    readonly settings: {
        readonly autoCorrection: boolean;
        readonly soundEffects: boolean;
        readonly explanationLocale: string;
        readonly voiceEnabled: boolean;
    };
    readonly plan: string;
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `settings-${randomUUID()}`;
const PASSWORD = `Settings-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";
/** Код Postgres «недостаточно прав»: колоночного update-гранта на preferences и plan у authenticated нет. */
const INSUFFICIENT_PRIVILEGE = "42501";
/** Язык свежей строки profiles: он же дефолт explanationLocale, пока выбор не сохранён. */
const DEFAULT_LOCALE = "ru";
/** Тариф свежей строки: plan назначает сервер/биллинг, в схеме PATCH его нет. */
const DEFAULT_PLAN = "free";
/** Тело прежнего клиента P-2: остаётся валидным, потому что патч стал частичным. */
const LEGACY_BODY = { autoCorrection: false, soundEffects: false } as const;

/** Полный конверт ответа: план и незатронутые настройки присутствуют всегда, даже если их не присылали. */
function expectedBody(preferences: {
    readonly autoCorrection: boolean;
    readonly soundEffects: boolean;
    readonly explanationLocale?: string;
    readonly voiceEnabled?: boolean;
}): SettingsBody {
    return {
        settings: {
            autoCorrection: preferences.autoCorrection,
            soundEffects: preferences.soundEffects,
            explanationLocale: preferences.explanationLocale ?? DEFAULT_LOCALE,
            voiceEnabled: preferences.voiceEnabled ?? false,
        },
        plan: DEFAULT_PLAN,
    };
}

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

/** Свежий аккаунт (триггер оставляет дефолты, preferences = {}) и его сессия: изоляция на тест. */
async function freshSession(
    baseUrl: string
): Promise<{ readonly id: string; readonly email: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-fresh-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email);

    return { id, email, jar: await loginSession(baseUrl, email) };
}

/** Токен прямо из GoTrue: для прямой проверки колоночного гранта пользовательским клиентом. */
async function accessTokenFor(email: string): Promise<string> {
    const { data, error } = await createAnonClient().auth.signInWithPassword({
        email,
        password: PASSWORD,
    });

    if (error !== null || data.session === null) {
        throw new Error("вход тестового пользователя не вернул сессию");
    }

    return data.session.access_token;
}

function errorBody(body: unknown): ErrorEnvelopeBody {
    return body as ErrorEnvelopeBody;
}

/** Значение jsonb-колонки из БД сервисным клиентом: сверка ответа маршрута с источником правды (§16.5). */
async function dbPreferences(id: string): Promise<unknown> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("preferences")
        .eq("id", id)
        .maybeSingle();

    if (error !== null) throw error;
    if (data === null) throw new Error("строка профиля тестового пользователя не создана");

    return data.preferences;
}

/** Тариф из entitlements: единственный источник плана; null — строки у пользователя ещё нет. */
async function dbPlan(id: string): Promise<string | null> {
    const { data, error } = await createAdminClient()
        .from("entitlements")
        .select("plan")
        .eq("user_id", id)
        .maybeSingle();

    if (error !== null) throw error;

    return data?.plan ?? null;
}

/** Язык интерфейса строки профиля: language живёт в profiles.locale. */
async function dbLocale(id: string): Promise<string> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("locale")
        .eq("id", id)
        .maybeSingle();

    if (error !== null) throw error;
    if (data === null) throw new Error("строка профиля тестового пользователя не создана");

    return data.locale;
}

beforeAll(async () => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };
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
// возвращаем fail-closed дефолт, как это делает profile.test.ts.
beforeEach(() => {
    configureCookies({ secure: false });
});

afterEach(() => {
    configureCookies({ secure: true });
});

describe("GET /api/settings", () => {
    it("1: новый пользователь получает дефолты из пустого jsonb и plan, без лишних ключей", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/settings`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as SettingsBody;

            expect(response.status).toBe(200);
            // ARCHITECT: колонка хранит {} — дефолты подставляет схема чтения, поэтому конверт всегда полный:
            // язык строки задаёт explanationLocale, голос по умолчанию выключен, тариф — free.
            expect(body).toEqual({
                settings: {
                    autoCorrection: true,
                    soundEffects: true,
                    explanationLocale: DEFAULT_LOCALE,
                    voiceEnabled: false,
                },
                plan: DEFAULT_PLAN,
            });
            expect(Object.keys(body.settings).sort()).toEqual([
                "autoCorrection",
                "explanationLocale",
                "soundEffects",
                "voiceEnabled",
            ]);
            expect(await dbPreferences(me.id)).toEqual({});
            expect(await dbLocale(me.id)).toBe(DEFAULT_LOCALE);
            // ARCHITECT: план читается из entitlements: профильного дубля нет, GET заводит строку с free.
            expect(await dbPlan(me.id)).toBe(DEFAULT_PLAN);
        });
    }, 30_000);

    it("2: отвечает 401 без access-куки, без деталей", async () => {
        await withApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/settings`);
            const text = await response.text();
            const body = errorBody(JSON.parse(text));

            expect(response.status).toBe(401);
            expect(body.error.code).toBe("UNAUTHORIZED");
            expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
            expect(text).not.toContain("preferences");
        });
    }, 30_000);

    it("7a: чужой id в query игнорируется — читается только своя строка", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const headers = mutationHeaders(alice.jar, app.baseUrl);

            // ARCHITECT: alice выключает оба toggle, bob остаётся на дефолтах: так видно, чью строку вернул GET.
            const enabled = await patchJson(
                app.baseUrl,
                "/api/settings",
                { autoCorrection: false, soundEffects: false },
                headers
            );

            expect(enabled.status).toBe(200);

            const readHeaders = { cookie: cookieHeader(alice.jar) };
            const byId = await fetch(`${app.baseUrl}/api/settings?id=${bob.id}`, {
                headers: readHeaders,
            });
            const byUserId = await fetch(`${app.baseUrl}/api/settings?userId=${bob.id}`, {
                headers: readHeaders,
            });
            const own = await fetch(`${app.baseUrl}/api/settings`, { headers: readHeaders });

            const expected = expectedBody(LEGACY_BODY);

            expect(byId.status).toBe(200);
            expect((await byId.json()) as SettingsBody).toEqual(expected);
            expect(byUserId.status).toBe(200);
            expect((await byUserId.json()) as SettingsBody).toEqual(expected);
            expect((await own.json()) as SettingsBody).toEqual(expected);
            expect(await dbPreferences(bob.id)).toEqual({});
        });
    }, 30_000);
});

describe("PATCH /api/settings", () => {
    it("3: сохраняет оба toggle, GET отражает сохранённое", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await patchJson(
                app.baseUrl,
                "/api/settings",
                { autoCorrection: false, soundEffects: false },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as SettingsBody;
            const read = await fetch(`${app.baseUrl}/api/settings`, {
                headers: { cookie: cookieHeader(me.jar) },
            });

            expect(response.status).toBe(200);
            expect(body).toEqual(expectedBody(LEGACY_BODY));
            expect((await read.json()) as SettingsBody).toEqual(expectedBody(LEGACY_BODY));
            // ARCHITECT: merge пишет ровно присланные ключи: дефолтов в колонке не появляется, тело P-2
            // не дописывает explanationLocale/voiceEnabled.
            expect(await dbPreferences(me.id)).toEqual({
                autoCorrection: false,
                soundEffects: false,
            });
        });
    }, 30_000);

    it("4: повтор тем же телом идемпотентен — оба ответа 200 и одинаковы", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const body = { autoCorrection: true, soundEffects: false };
            const first = await patchJson(app.baseUrl, "/api/settings", body, headers);
            const second = await patchJson(app.baseUrl, "/api/settings", body, headers);

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect((await first.json()) as SettingsBody).toEqual(
                (await second.json()) as SettingsBody
            );
            expect(await dbPreferences(me.id)).toEqual({
                autoCorrection: true,
                soundEffects: false,
            });
        });
    }, 30_000);

    it("5: отвечает 403 без csrf-заголовка и не меняет строку", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbPreferences(me.id);
            const response = await patchJson(
                app.baseUrl,
                "/api/settings",
                { autoCorrection: false, soundEffects: false },
                { cookie: cookieHeader(me.jar), origin: app.baseUrl }
            );

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(await dbPreferences(me.id)).toEqual(before);
        });
    }, 30_000);

    it("6: отклоняет 400 пустое, неверное по типу и расширенное тела, включая plan", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const before = await dbPreferences(me.id);
            const invalidBodies: readonly unknown[] = [
                {},
                { autoCorrection: "yes" },
                { soundEffects: 1 },
                { explanationLocale: "xx" },
                { explanationLocale: null },
                { voiceEnabled: "true" },
                // ARCHITECT: theme/notifications контрактом не закреплены — лишний ключ отклоняется (§16.6).
                { autoCorrection: true, soundEffects: true, theme: "dark" },
                // ARCHITECT: plan и id/userId приходят не от клиента: тариф назначает биллинг, владение
                // определяется токеном (§16.2, §16.9), поэтому strictObject и схема без plan их отклоняют.
                { plan: "pro" },
                { id: "a1b2c3d4-0001-4000-8000-000000000001", autoCorrection: true },
                { userId: "a1b2c3d4-0001-4000-8000-000000000001", autoCorrection: true },
            ];

            for (const invalid of invalidBodies) {
                const response = await patchJson(app.baseUrl, "/api/settings", invalid, headers);

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            expect(await dbPreferences(me.id)).toEqual(before);
            // ARCHITECT: отклонённый патч не заводит и не трогает тариф: строку entitlements создаёт только
            // чтение плана на GET.
            expect(await dbPlan(me.id)).toBeNull();
        });
    }, 30_000);

    it("7b: чужой id в теле отсекается, чужая строка не меняется", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const bobBefore = await dbPreferences(bob.id);
            const tampered = await patchJson(
                app.baseUrl,
                "/api/settings",
                { id: bob.id, autoCorrection: false, soundEffects: false },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(tampered.status).toBe(400);
            expect(await dbPreferences(bob.id)).toEqual(bobBefore);

            const own = await patchJson(
                app.baseUrl,
                "/api/settings",
                { autoCorrection: false, soundEffects: true },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(own.status).toBe(200);
            expect(await dbPreferences(alice.id)).toEqual({
                autoCorrection: false,
                soundEffects: true,
            });
            expect(await dbPreferences(bob.id)).toEqual(bobBefore);
        });
    }, 30_000);
});

describe("лимиты и гранты /api/settings", () => {
    it("8: чтение ограничено шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = { cookie: cookieHeader(me.jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/settings`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/settings`, { headers });

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);

    it("9: запись ограничена двадцатью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const body = { autoCorrection: true, soundEffects: false };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 20; attempt += 1) {
                const response = await patchJson(app.baseUrl, "/api/settings", body, headers);

                attempted.push(response.status);
            }

            const limited = await patchJson(app.baseUrl, "/api/settings", body, headers);

            expect(attempted).toEqual(Array.from({ length: 20 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);

    it("10: клиент не пишет preferences и entitlements, но пишет display_name — гранты не расширены", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const before = await dbPreferences(me.id);
            const user = createUserClient(await accessTokenFor(me.email));
            const denied = await user
                .from("profiles")
                .update({ preferences: { autoCorrection: false, soundEffects: false } })
                .eq("id", me.id);
            // ARCHITECT: тариф живёт в entitlements, и клиенту там не выдан ни update, ни select: ни назначить
            // план, ни прочитать его напрямую он не может (§16.2, §16.5, §16.9).
            const deniedPlan = await user
                .from("entitlements")
                .update({ plan: "pro" })
                .eq("user_id", me.id);
            const readEntitlements = await user
                .from("entitlements")
                .select("plan")
                .eq("user_id", me.id);
            const allowed = await user
                .from("profiles")
                .update({ display_name: "Клиент" })
                .eq("id", me.id);
            const renamed = await createAdminClient()
                .from("profiles")
                .select("display_name")
                .eq("id", me.id)
                .single();

            // ARCHITECT: grant update (display_name, locale, daily_minutes) есть, на preferences — нет:
            // запись настроек остаётся серверной (§16.2, §16.5, §16.9).
            expect(denied.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
            expect(deniedPlan.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
            expect(readEntitlements.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
            expect(allowed.error).toBeNull();
            expect(renamed.data?.display_name).toBe("Клиент");
            expect(await dbPreferences(me.id)).toEqual(before);
            // ARCHITECT: отказ не создал строку тарифа: плана у пользователя по-прежнему нет.
            expect(await dbPlan(me.id)).toBeNull();
        });
    }, 30_000);
});

describe("plan и новые настройки /api/settings", () => {
    it("11: explanationLocale наследует язык строки, voiceEnabled по умолчанию выключен", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            // ARCHITECT: язык интерфейса меняется в профиле, а не в настройках, поэтому дефолт объяснений
            // проверяется на строке с другим locale.
            const changed = await createAdminClient()
                .from("profiles")
                .update({ locale: "es" })
                .eq("id", me.id);

            expect(changed.error).toBeNull();

            const response = await fetch(`${app.baseUrl}/api/settings`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as SettingsBody;

            expect(response.status).toBe(200);
            expect(body).toEqual({
                settings: {
                    autoCorrection: true,
                    soundEffects: true,
                    explanationLocale: "es",
                    voiceEnabled: false,
                },
                plan: DEFAULT_PLAN,
            });
        });
    }, 30_000);

    it("12: тело P-2 остаётся валидным и не затирает новые настройки", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const advanced = await patchJson(
                app.baseUrl,
                "/api/settings",
                { explanationLocale: "en", voiceEnabled: true },
                headers
            );

            expect(advanced.status).toBe(200);

            const legacy = await patchJson(app.baseUrl, "/api/settings", LEGACY_BODY, headers);
            const body = (await legacy.json()) as SettingsBody;

            expect(legacy.status).toBe(200);
            // ARCHITECT: патч частичный — тело без новых ключей их сохраняет, а не сбрасывает в дефолты.
            expect(body).toEqual(
                expectedBody({ ...LEGACY_BODY, explanationLocale: "en", voiceEnabled: true })
            );
            expect(await dbPreferences(me.id)).toEqual({
                autoCorrection: false,
                soundEffects: false,
                explanationLocale: "en",
                voiceEnabled: true,
            });
        });
    }, 30_000);

    it("13: частичный патч меняет только присланное поле и не пишет дефолт", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);

            await patchJson(app.baseUrl, "/api/settings", LEGACY_BODY, headers);

            const response = await patchJson(
                app.baseUrl,
                "/api/settings",
                { voiceEnabled: true },
                headers
            );
            const body = (await response.json()) as SettingsBody;

            expect(response.status).toBe(200);
            expect(body).toEqual(expectedBody({ ...LEGACY_BODY, voiceEnabled: true }));
            // ARCHITECT: невыбранный язык в колонке не сохраняется: ответ показывает дефолт языка строки,
            // а не записанное значение.
            expect(await dbPreferences(me.id)).toEqual({
                autoCorrection: false,
                soundEffects: false,
                voiceEnabled: true,
            });
        });
    }, 30_000);

    it("14: план читается из entitlements, а не из строки профиля", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            // ARCHITECT: тариф назначает биллинг в entitlements: сервисный клиент ставит pro, и GET обязан
            // вернуть именно его — иначе тариф остался бы с вторым источником, как было с profiles.plan.
            const upgraded = await createAdminClient()
                .from("entitlements")
                .upsert({ user_id: me.id, plan: "pro" }, { onConflict: "user_id" });

            expect(upgraded.error).toBeNull();

            const response = await fetch(`${app.baseUrl}/api/settings`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as SettingsBody;

            expect(response.status).toBe(200);
            expect(body.plan).toBe("pro");
            expect(await dbPlan(me.id)).toBe("pro");
        });
    }, 30_000);
});
