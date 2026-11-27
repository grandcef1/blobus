// ARCHITECT: доменный роутер чтения словаря проверяется по реальному HTTP на локальном стеке Supabase:
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

interface VocabularyDto {
    readonly id: string;
    readonly term: string;
    readonly translation: string | null;
    readonly context: string | null;
    readonly exampleTranslation: string | null;
    readonly sourceLessonId: string | null;
    readonly stage: number;
    readonly nextDueAt: string;
    readonly createdAt: string;
    readonly updatedAt: string;
}

interface VocabularyListBody {
    readonly vocabulary: readonly VocabularyDto[];
}

interface VocabularyInput {
    readonly term: string;
    readonly createdAt: string;
    readonly translation?: string | null;
    readonly context?: string | null;
    readonly exampleTranslation?: string | null;
    readonly sourceLessonId?: string | null;
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `vocabulary-${randomUUID()}`;
const PASSWORD = `Vocabulary-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";
/** Код Postgres «недостаточно прав»: у anon нет select-гранта на vocabulary. */
const INSUFFICIENT_PRIVILEGE = "42501";
const TUTOR_ID = "miya";
const MODE = "speaking";
const DAILY_MINUTES = 15;

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

/** Создаёт строку vocabulary сервисным клиентом: insert-грантов у authenticated нет (§16.5). */
async function insertVocabulary(userId: string, input: VocabularyInput): Promise<string> {
    const { data, error } = await createAdminClient()
        .from("vocabulary")
        .insert({
            user_id: userId,
            term: input.term,
            translation: input.translation ?? null,
            context: input.context ?? null,
            example_translation: input.exampleTranslation ?? null,
            source_lesson_id: input.sourceLessonId ?? null,
            created_at: input.createdAt,
        })
        .select("id")
        .single();

    if (error !== null) throw error;

    return data.id;
}

/** Урок для непустого source_lesson_id: у словаря внешний ключ на public.lessons. */
async function insertLesson(userId: string): Promise<string> {
    const session = await createAdminClient()
        .from("sessions")
        .insert({ user_id: userId, tutor_id: TUTOR_ID, mode: MODE })
        .select("id")
        .single();

    if (session.error !== null) throw session.error;

    const lesson = await createAdminClient()
        .from("lessons")
        .insert({ session_id: session.data.id, daily_minutes: DAILY_MINUTES })
        .select("id")
        .single();

    if (lesson.error !== null) throw lesson.error;

    return lesson.data.id;
}

/** Ожидаемый DTO из БД сервисным клиентом тем же порядком, что отдаёт маршрут: источник правды (§16.5). */
async function dbVocabulary(userId: string): Promise<VocabularyDto[]> {
    const { data, error } = await createAdminClient()
        .from("vocabulary")
        .select(
            "id, user_id, term, translation, context, example_translation, source_lesson_id, stage, next_due_at, created_at, updated_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);

    if (error !== null) throw error;

    return data.map((row) => ({
        id: row.id,
        term: row.term,
        translation: row.translation,
        context: row.context,
        exampleTranslation: row.example_translation,
        sourceLessonId: row.source_lesson_id,
        stage: row.stage,
        nextDueAt: row.next_due_at,
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

describe("GET /api/vocabulary", () => {
    it("3.1 отдаёт свои слова порядком created_at desc, id desc, с null вместо пустых строк", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const lessonId = await insertLesson(me.id);
            await insertVocabulary(me.id, {
                term: "collaborate",
                translation: "сотрудничать",
                context: "We need to collaborate on this project.",
                exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
                sourceLessonId: lessonId,
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await insertVocabulary(me.id, {
                term: "Deadline",
                translation: null,
                context: null,
                createdAt: "2026-11-19T09:30:00.000Z",
            });
            // равный created_at: пара проверяет вторичный ключ id desc
            await insertVocabulary(me.id, {
                term: "resolve",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await insertVocabulary(me.id, {
                term: "achieve",
                createdAt: "2026-11-17T12:00:00.000Z",
            });

            const response = await fetch(`${app.baseUrl}/api/vocabulary`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as VocabularyListBody;
            const expected = await dbVocabulary(me.id);

            expect(response.status).toBe(200);
            expect(body.vocabulary).toHaveLength(4);
            // ARCHITECT: PostgREST отдаёт timestamptz как «+00:00», поэтому порядок сверяем по инстантам.
            expect(body.vocabulary.map((entry) => Date.parse(entry.createdAt))).toEqual([
                Date.parse("2026-11-19T09:30:00.000Z"),
                Date.parse("2026-11-18T10:00:00.000Z"),
                Date.parse("2026-11-18T10:00:00.000Z"),
                Date.parse("2026-11-17T12:00:00.000Z"),
            ]);
            // при равном created_at uuid идёт по убыванию
            expect(body.vocabulary[1].id > body.vocabulary[2].id).toBe(true);
            // DTO совпадает с источником правды и не содержит user_id
            expect(body.vocabulary).toEqual(expected);
            expect(Object.keys(body.vocabulary[0]).sort()).toEqual([
                "context",
                "createdAt",
                "exampleTranslation",
                "id",
                "nextDueAt",
                "sourceLessonId",
                "stage",
                "term",
                "translation",
                "updatedAt",
            ]);
            // ARCHITECT: миграция проставила существующим словам шаг 1 и ближайший показ, поэтому все
            // строки сразу попадают в очередь повторения.
            expect(body.vocabulary.every((entry) => entry.stage === 1)).toBe(true);
            expect(body.vocabulary.every((entry) => entry.nextDueAt.length > 0)).toBe(true);

            // ARCHITECT: null из БД остаётся null: пустая строка соврала бы про отсутствие перевода.
            const bare = body.vocabulary.find((entry) => entry.term === "Deadline");
            expect(bare?.translation).toBeNull();
            expect(bare?.context).toBeNull();
            expect(bare?.exampleTranslation).toBeNull();
            expect(bare?.sourceLessonId).toBeNull();

            const linked = body.vocabulary.find((entry) => entry.term === "collaborate");
            expect(linked?.translation).toBe("сотрудничать");
            expect(linked?.context).toBe("We need to collaborate on this project.");
            expect(linked?.exampleTranslation).toBe("Нам нужно сотрудничать над этим проектом.");
            expect(linked?.sourceLessonId).toBe(lessonId);
        });
    }, 30_000);

    it("3.2 cross-user: каждый видит только свои слова", async () => {
        await withApp(async (app) => {
            const alice = await freshUser(app.baseUrl);
            const bob = await freshUser(app.baseUrl);
            await insertVocabulary(alice.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await insertVocabulary(bob.id, {
                term: "deadline",
                createdAt: "2026-11-18T11:00:00.000Z",
            });

            const aliceResponse = await fetch(`${app.baseUrl}/api/vocabulary`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const bobResponse = await fetch(`${app.baseUrl}/api/vocabulary`, {
                headers: { cookie: cookieHeader(bob.jar) },
            });
            const aliceBody = (await aliceResponse.json()) as VocabularyListBody;
            const bobBody = (await bobResponse.json()) as VocabularyListBody;

            expect(aliceBody.vocabulary).toEqual(await dbVocabulary(alice.id));
            expect(bobBody.vocabulary).toEqual(await dbVocabulary(bob.id));
            expect(aliceBody.vocabulary).toHaveLength(1);
            expect(bobBody.vocabulary).toHaveLength(1);
            expect(aliceBody.vocabulary[0].id).not.toBe(bobBody.vocabulary[0].id);
        });
    }, 30_000);
});

describe("GET /api/vocabulary: негативные проверки", () => {
    it("3.3 отвечает 401 без access-куки безопасным конвертом", async () => {
        await withApp(async (app) => {
            const response = await fetch(`${app.baseUrl}/api/vocabulary`);
            const text = await response.text();
            const body = errorBody(JSON.parse(text));

            expect(response.status).toBe(401);
            expect(body.error.code).toBe("UNAUTHORIZED");
            expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
            expect(text).not.toContain("stack");
            expect(text).not.toContain("vocabulary");
        });
    }, 30_000);

    it("3.4 отвечает 401 на поддельную куку тем же телом, что без куки, и не светит токен", async () => {
        await withApp(async (app) => {
            const sentinel = "forged-vocabulary-token-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            try {
                const anonymous = await fetch(`${app.baseUrl}/api/vocabulary`);
                const anonymousBody = errorBody(await anonymous.json());
                const forged = await fetch(`${app.baseUrl}/api/vocabulary`, {
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

    it("3.5 игнорирует клиентские ?userId и ?id: возвращает только свои слова", async () => {
        await withApp(async (app) => {
            const alice = await freshUser(app.baseUrl);
            const bob = await freshUser(app.baseUrl);
            const aliceEntryId = await insertVocabulary(alice.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const bobEntryId = await insertVocabulary(bob.id, {
                term: "deadline",
                createdAt: "2026-11-18T11:00:00.000Z",
            });

            const byUserId = await fetch(`${app.baseUrl}/api/vocabulary?userId=${bob.id}`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const byId = await fetch(`${app.baseUrl}/api/vocabulary?id=${bobEntryId}`, {
                headers: { cookie: cookieHeader(alice.jar) },
            });
            const byUserIdBody = (await byUserId.json()) as VocabularyListBody;
            const byIdBody = (await byId.json()) as VocabularyListBody;

            expect(byUserId.status).toBe(200);
            expect(byId.status).toBe(200);
            expect(byUserIdBody.vocabulary).toEqual(await dbVocabulary(alice.id));
            expect(byIdBody.vocabulary).toEqual(await dbVocabulary(alice.id));
            expect(byUserIdBody.vocabulary.map((entry) => entry.id)).toEqual([aliceEntryId]);
        });
    }, 30_000);

    it("3.6 ограничивает чтение шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const headers = { cookie: cookieHeader(me.jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/vocabulary`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/vocabulary`, { headers });
            const limitedText = await limited.text();

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(JSON.parse(limitedText)).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
            expect(limitedText).not.toContain("stack");
        });
    }, 60_000);

    it("3.7 пустой список отдаёт { vocabulary: [] }", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/vocabulary`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as VocabularyListBody;

            expect(response.status).toBe(200);
            expect(body).toEqual({ vocabulary: [] });
        });
    }, 30_000);
});

describe("GET /api/vocabulary/review", () => {
    /** Тело очереди: слово и сгенерированное к нему задание. */
    interface ReviewQueueBody {
        readonly queue: readonly {
            readonly id: string;
            readonly stage: number;
            readonly task: {
                readonly type: string;
                readonly prompt: string;
                readonly answer?: string;
                readonly answerId?: string;
                readonly options?: readonly { readonly id: string; readonly text: string }[];
            };
        }[];
    }

    it("3.10 отдаёт детерминированную очередь: задания по своим словам, дистракторы из них же", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);

            await insertVocabulary(me.id, {
                term: "collaborate",
                translation: "сотрудничать",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await insertVocabulary(me.id, {
                term: "deadline",
                translation: "срок",
                createdAt: "2026-11-18T10:01:00.000Z",
            });
            await insertVocabulary(me.id, {
                term: "improve",
                translation: "улучшать",
                createdAt: "2026-11-18T10:02:00.000Z",
            });

            const response = await fetch(`${app.baseUrl}/api/vocabulary/review`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await response.json()) as ReviewQueueBody;
            const again = (await (
                await fetch(`${app.baseUrl}/api/vocabulary/review`, {
                    headers: { cookie: cookieHeader(me.jar) },
                })
            ).json()) as ReviewQueueBody;

            expect(response.status).toBe(200);
            expect(body.queue).toHaveLength(3);
            // ARCHITECT: генерация детерминирована: тот же словарь даёт ту же очередь, повтор запроса её не меняет.
            expect(again).toEqual(body);

            const item = body.queue[0];

            if (item === undefined || item.task.type !== "choice") throw new Error("ожидалось задание выбора");

            const task = item.task;
            const correct = task.options?.find((option) => option.id === task.answerId);

            expect(task.prompt).toBe("collaborate");
            expect(correct?.text).toBe("сотрудничать");
            // ARCHITECT: дистракторы берутся из других слов ученика и не повторяют верный ответ (§спец. 5).
            for (const option of (task.options ?? []).filter((o) => o.id !== task.answerId))
                expect(option.text).not.toBe("сотрудничать");
        });
    }, 60_000);

    it("3.11 отвечает 401 без куки и не показывает чужие слова", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const other = await freshUser(app.baseUrl);

            await insertVocabulary(other.id, {
                term: "serendipity",
                translation: "озарение",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await insertVocabulary(other.id, {
                term: "tenacity",
                translation: "упорство",
                createdAt: "2026-11-18T10:01:00.000Z",
            });

            const anonymous = await fetch(`${app.baseUrl}/api/vocabulary/review`);
            const mine = await fetch(`${app.baseUrl}/api/vocabulary/review`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const body = (await mine.json()) as ReviewQueueBody;

            expect(anonymous.status).toBe(401);
            expect(errorBody(await anonymous.json()).error.code).toBe("UNAUTHORIZED");
            // ARCHITECT: очередь строится только по словам владельца токена: чужие термины в задания не попадают (§16.5).
            expect(mine.status).toBe(200);
            expect(body.queue).toEqual([]);
        });
    }, 60_000);
});

describe("RLS таблицы vocabulary", () => {
    it("3.8 своя выборка видна, чужая пуста, аноним получает 42501", async () => {
        const mineEmail = `${EMAIL_PREFIX}-rls-mine-${randomUUID()}@example.test`;
        const foreignEmail = `${EMAIL_PREFIX}-rls-foreign-${randomUUID()}@example.test`;
        const mineId = await createConfirmedUser(mineEmail);
        const foreignId = await createConfirmedUser(foreignEmail);
        await insertVocabulary(mineId, {
            term: "collaborate",
            createdAt: "2026-11-18T10:00:00.000Z",
        });
        await insertVocabulary(foreignId, {
            term: "deadline",
            createdAt: "2026-11-18T11:00:00.000Z",
        });

        const tokens = await sessionPairFor(mineEmail);
        const user = createUserClient(tokens.accessToken);

        const own = await user.from("vocabulary").select("id").eq("user_id", mineId);
        const foreign = await user.from("vocabulary").select("id").eq("user_id", foreignId);
        const anonymous = await createAnonClient().from("vocabulary").select("id");

        // ARCHITECT: политика select-own отдаёт только строки с user_id = auth.uid(); у anon нет select-гранта (§16.5).
        expect(own.error).toBeNull();
        expect(own.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 30_000);
});
/** Строка словаря из БД сервисным клиентом: поля и владелец сверяются с источником правды (§16.5). */
async function dbEntryById(
    id: string
): Promise<{ readonly dto: VocabularyDto; readonly userId: string }> {
    const { data, error } = await createAdminClient()
        .from("vocabulary")
        .select(
            "id, user_id, term, translation, context, example_translation, source_lesson_id, stage, next_due_at, created_at, updated_at"
        )
        .eq("id", id)
        .single();

    if (error !== null) throw error;

    return {
        dto: {
            id: data.id,
            term: data.term,
            translation: data.translation,
            context: data.context,
            exampleTranslation: data.example_translation,
            sourceLessonId: data.source_lesson_id,
            stage: data.stage,
            nextDueAt: data.next_due_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        },
        userId: data.user_id,
    };
}

/** Допуск на время выполнения запроса: интервал следующего показа сверяется окном ±2 минуты. */
const DUE_TOLERANCE_MS = 2 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ставит строке словаря заданный шаг: нужен, чтобы проверить переходы с середины лестницы. */
async function setStage(id: string, stage: number): Promise<void> {
    const { error } = await createAdminClient().from("vocabulary").update({ stage }).eq("id", id);

    if (error !== null) throw error;
}

/** Проверяет, что nextDueAt отстоит от «сейчас» на days дней с допуском на время запроса. */
function expectDueInDays(nextDueAt: string, days: number): void {
    const delta = Date.parse(nextDueAt) - Date.now();

    expect(Math.abs(delta - days * DAY_MS)).toBeLessThan(DUE_TOLERANCE_MS);
}

describe("PATCH /api/vocabulary/:id", () => {
    it("6.1 «помню» на шаге 1: 200, шаг 2 и повтор через 3 дня", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "remembered" },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as { entry: VocabularyDto };
            const stored = await dbEntryById(id);

            expect(response.status).toBe(200);
            expect(body.entry.stage).toBe(2);
            expectDueInDays(body.entry.nextDueAt, 3);
            expect(body.entry).toEqual(stored.dto);
            expect(stored.dto.stage).toBe(2);
            expect(stored.userId).toBe(me.id);
        });
    }, 30_000);

    it("6.2 «помню» на пятом шаге: шаг остаётся 5, повтор через 90 дней", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await setStage(id, 5);

            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "remembered" },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as { entry: VocabularyDto };

            expect(response.status).toBe(200);
            expect(body.entry.stage).toBe(5);
            expectDueInDays(body.entry.nextDueAt, 90);
        });
    }, 30_000);

    it("6.3 «забыл» с третьего шага: шаг 1 и повтор через 1 день", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            await setStage(id, 3);

            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "forgotten" },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as { entry: VocabularyDto };
            const stored = await dbEntryById(id);

            expect(response.status).toBe(200);
            expect(body.entry.stage).toBe(1);
            expectDueInDays(body.entry.nextDueAt, 1);
            expect(stored.dto.stage).toBe(1);
        });
    }, 30_000);

    it("6.4 отклоняет 400: невалидный исход, лишнее поле, невалидный id", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const invalidBodies: readonly unknown[] = [
                { reviewed: "maybe" },
                { reviewed: "remembered", stage: 4 },
                {},
            ];

            for (const body of invalidBodies) {
                const response = await patchJson(
                    app.baseUrl,
                    `/api/vocabulary/${id}`,
                    body,
                    headers
                );

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            const badId = await patchJson(
                app.baseUrl,
                "/api/vocabulary/not-a-uuid",
                { reviewed: "remembered" },
                headers
            );

            expect(badId.status).toBe(400);
            expect((await dbEntryById(id)).dto.stage).toBe(1);
        });
    }, 30_000);

    it("6.5 401 без куки и с поддельным токеном, сентинел не утекает", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const pair = await fetchCsrfPair(app.baseUrl);
            const sentinel = "forged-review-token-sentinel";
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

            try {
                const anonymous = await patchJson(
                    app.baseUrl,
                    `/api/vocabulary/${id}`,
                    { reviewed: "remembered" },
                    mutationHeaders(pair, app.baseUrl)
                );
                const forged = await patchJson(
                    app.baseUrl,
                    `/api/vocabulary/${id}`,
                    { reviewed: "remembered" },
                    {
                        ...mutationHeaders(pair, app.baseUrl),
                        cookie: `${cookieHeader(pair)}; ${COOKIE_NAMES.accessToken}=${sentinel}`,
                    }
                );
                const forgedText = await forged.text();

                expect(anonymous.status).toBe(401);
                expect(forged.status).toBe(401);
                expect(errorBody(JSON.parse(forgedText)).error.code).toBe("UNAUTHORIZED");
                expect(forgedText).not.toContain(sentinel);
                expect(forgedText).not.toContain("stack");
                expect(errorSpy.mock.calls.flat().map(String).join("\n")).not.toContain(sentinel);
                expect((await dbEntryById(id)).dto.stage).toBe(1);
            } finally {
                errorSpy.mockRestore();
            }
        });
    }, 30_000);

    it("6.6 403 без CSRF-пары, шаг не меняется", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "remembered" },
                { cookie: cookieHeader(me.jar), origin: app.baseUrl }
            );

            expect(response.status).toBe(403);
            expect((await dbEntryById(id)).dto.stage).toBe(1);
        });
    }, 30_000);

    it("6.7 чужое слово отдаёт 404 и не меняется", async () => {
        await withApp(async (app) => {
            const alice = await freshUser(app.baseUrl);
            const bob = await freshUser(app.baseUrl);
            const id = await insertVocabulary(alice.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });

            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "remembered" },
                mutationHeaders(bob.jar, app.baseUrl)
            );

            expect(response.status).toBe(404);
            expect(errorBody(await response.json()).error.code).toBe("NOT_FOUND");
            expect((await dbEntryById(id)).dto.stage).toBe(1);
        });
    }, 30_000);

    it("6.8 несуществующее слово отдаёт 404", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const response = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${randomUUID()}`,
                { reviewed: "remembered" },
                mutationHeaders(me.jar, app.baseUrl)
            );

            expect(response.status).toBe(404);
        });
    }, 30_000);

    it("6.9 ограничивает повторение шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshUser(app.baseUrl);
            const id = await insertVocabulary(me.id, {
                term: "collaborate",
                createdAt: "2026-11-18T10:00:00.000Z",
            });
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await patchJson(
                    app.baseUrl,
                    `/api/vocabulary/${id}`,
                    { reviewed: "remembered" },
                    headers
                );

                attempted.push(response.status);
            }

            const limited = await patchJson(
                app.baseUrl,
                `/api/vocabulary/${id}`,
                { reviewed: "remembered" },
                headers
            );

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);
});
