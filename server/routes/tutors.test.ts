// ARCHITECT: каталог репетиторов проверяется по реальному HTTP на локальном стеке Supabase: сессия берётся
// настоящим логином, поэтому 401 и лимит проверяются на живом окружении, а не на заглушке. Список сверяется
// со снимком перенесённого клиентского источника — это и есть защита от расхождения «моки vs сервер».
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { COOKIE_NAMES, configureCookies } from "../cookies.ts";
import type { SupabaseEnv } from "../supabase.ts";
import { createAdminClient, readLocalStack } from "../test-stack.ts";
import { VOICE_IDS } from "../tutorCatalog.ts";

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

/** Репетитор как его видит клиент: те же поля, что в перенесённом источнике, плюс профиль голоса. */
interface TutorBody {
    readonly id: string;
    readonly name: string;
    readonly voiceId: string;
    readonly traits: Record<string, unknown>;
    readonly persona: {
        readonly traits: readonly string[];
        readonly teachingStyle: string;
        readonly story: string;
    };
}

interface TutorsBody {
    readonly tutors: readonly TutorBody[];
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `tutors-${randomUUID()}`;
const PASSWORD = `Tutors-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";

// ARCHITECT: ожидаемый порядок и имена — снимок перенесённого клиентского источника
// (src/api/mocks/blobatars.ts): тест падает, если серверный каталог потерял репетитора, переставил
// их или переименовал.
const EXPECTED_TUTORS: readonly { readonly id: string; readonly name: string }[] = [
    { id: "miya", name: "Мия" },
    { id: "oscar", name: "Оскар" },
    { id: "luna", name: "Луна" },
    { id: "max", name: "Макс" },
    { id: "alex", name: "Алекс" },
    { id: "zoe", name: "Зои" },
    { id: "nova", name: "Нова" },
    { id: "kai", name: "Кай" },
    { id: "lira", name: "Лира" },
    { id: "orion", name: "Орион" },
];

// ARCHITECT: строгие наборы ключей DTO: значения отсортированы так, как их отдаёт Object.keys().sort(),
// поэтому лишнее (служебное) поле ловится сравнением, а не глазами.
const TUTOR_KEYS = ["id", "name", "persona", "traits", "voiceId"];
const PERSONA_KEYS = ["story", "teachingStyle", "traits"];
const TRAIT_KEYS = [
    "body.n",
    "body.r",
    "body.ratio",
    "eye.gap",
    "eye.lean",
    "eye.rx",
    "hue",
    "shape",
    "tone",
];

let env: SupabaseEnv | undefined;
let userEmail: string | undefined;
/** Список профилей голоса как строк: проверка идёт значением из ответа, а не литералом теста. */
const VOICE_ID_LIST: readonly string[] = VOICE_IDS;

/** Отдаёт окружение стека и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctxEnv(): SupabaseEnv {
    if (env === undefined)
        throw new Error("local Supabase stack is not running: run npx supabase start");

    return env;
}

/** Почта пользователя, созданного в beforeAll: на его сессии проверяется позитивное чтение. */
function ctxEmail(): string {
    if (userEmail === undefined) throw new Error("тестовый пользователь не создан");

    return userEmail;
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
async function loginSession(baseUrl: string, email: string = ctxEmail()): Promise<Jar> {
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

function errorBody(body: unknown): ErrorEnvelopeBody {
    return body as ErrorEnvelopeBody;
}

/** Свежий аккаунт и его сессия: лимит в памяти считается по IP, поэтому тест лимита изолирован своим прогоном. */
async function freshSession(baseUrl: string): Promise<Jar> {
    const email = `${EMAIL_PREFIX}-fresh-${randomUUID()}@example.test`;

    await createConfirmedUser(email);

    return loginSession(baseUrl, email);
}

beforeAll(async () => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };

    const email = `${EMAIL_PREFIX}-user@example.test`;

    await createConfirmedUser(email);
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
describe("GET /api/tutors", () => {
    it("отвечает 401 без куки и на поддельную куку, не светя токен", async () => {
        await withApp(async (app) => {
            const sentinel = "fake-tutors-token-sentinel";
            const anonymous = await fetch(`${app.baseUrl}/api/tutors`);
            const anonymousBody = errorBody(await anonymous.json());
            const forged = await fetch(`${app.baseUrl}/api/tutors`, {
                headers: { cookie: `${COOKIE_NAMES.accessToken}=${sentinel}` },
            });
            const forgedText = await forged.text();

            expect(anonymous.status).toBe(401);
            expect(anonymousBody.error.code).toBe("UNAUTHORIZED");
            expect(forged.status).toBe(401);
            expect(errorBody(JSON.parse(forgedText)).error.code).toBe("UNAUTHORIZED");
            // ARCHITECT: токен не возвращается клиенту ни в теле, ни в заголовках (§16.11).
            expect(forgedText).not.toContain(sentinel);
        });
    }, 30_000);

    it("отдаёт каталог в порядке источника: те же id, имена и заполненная персона", async () => {
        await withApp(async (app) => {
            const jar = await loginSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/tutors`, {
                headers: { cookie: cookieHeader(jar) },
            });
            const body = (await response.json()) as TutorsBody;

            expect(response.status).toBe(200);
            expect(Object.keys(body)).toEqual(["tutors"]);
            expect(body.tutors.length).toBeGreaterThan(0);
            // ARCHITECT: сверка с перенесённым клиентским списком: порядок, состав и имена.
            expect(body.tutors.map((tutor) => ({ id: tutor.id, name: tutor.name }))).toEqual(
                EXPECTED_TUTORS
            );

            for (const tutor of body.tutors) {
                // ARCHITECT: персона приходит вместе с именем, а не догружается отдельно: карточка
                // репетитора читает её из этого же ответа.
                expect(tutor.persona.traits).toHaveLength(3);
                expect(tutor.persona.teachingStyle.length).toBeGreaterThan(0);
                expect(tutor.persona.story.length).toBeGreaterThan(0);
                // ARCHITECT: профиль голоса обязан быть из каталога: клиент выбирает голос озвучки только по нему.
                expect(VOICE_ID_LIST).toContain(tutor.voiceId);
            }
        });
    }, 30_000);

    it("ограничивает чтение шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const jar = await freshSession(app.baseUrl);
            const headers = { cookie: cookieHeader(jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/tutors`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/tutors`, { headers });

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);

    it("отдаёт DTO строго из четырёх полей, без служебных", async () => {
        await withApp(async (app) => {
            const jar = await loginSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/tutors`, {
                headers: { cookie: cookieHeader(jar) },
            });
            const body = (await response.json()) as TutorsBody;

            expect(response.status).toBe(200);

            for (const tutor of body.tutors) {
                expect(Object.keys(tutor).sort()).toEqual(TUTOR_KEYS);
                expect(Object.keys(tutor.persona).sort()).toEqual(PERSONA_KEYS);
                expect(Object.keys(tutor.traits).sort()).toEqual(TRAIT_KEYS);
                // ARCHITECT: tone — пара чисел, как её ждёт клиентский тип-кортеж.
                expect(tutor.traits.tone).toHaveLength(2);
            }
        });
    }, 30_000);
});
