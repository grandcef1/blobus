// ARCHITECT: тест уровня проверяется по реальному HTTP на локальном стеке Supabase: вопросы отдаются без
// верных ответов, а балл и уровень считает сервер. Негативные проверки обязательны: аноним, CSRF, подмена
// владельца, чужие questionId, лимиты и отказ клиенту в прямой записи в placement_results (§16.14).
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { COOKIE_NAMES, configureCookies } from "../cookies.ts";
import { QUESTIONS, QUESTION_IDS, computePlacement, levelForScore } from "../placementCatalog.ts";
import type { PlacementAnswer } from "../placementCatalog.ts";
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

/** Вопрос как его видит клиент: без верного ответа. */
interface QuestionBody {
    readonly id: string;
    readonly skill: string;
    readonly level: string;
    readonly prompt: string;
    readonly options: readonly { readonly id: string; readonly text: string }[];
}

/** Результат теста в конверте. */
interface ResultBody {
    readonly result: {
        readonly level: string;
        readonly score: number;
        readonly createdAt: string;
    };
}

/** Ответ GET: вопросы без верных ответов, признак прохождения и результат, если он уже есть. */
interface PlacementBody {
    readonly questions?: readonly QuestionBody[];
    readonly completed?: boolean;
    readonly result?: ResultBody["result"] | null;
}

/** Куки как их видит клиент: имя → значение, без атрибутов. */
type Jar = Record<string, string>;

const EMAIL_PREFIX = `placement-${randomUUID()}`;
const PASSWORD = `Placement-${randomUUID()}-1`;
const CSRF_HEADER = "x-csrf-token";
/** Код Postgres «недостаточно прав»: у authenticated на placement_results есть только select. */
const INSUFFICIENT_PRIVILEGE = "42501";
/** Размер формы: столько же ответов обязан прислать клиент — набор один на всех. */
const TOTAL_QUESTIONS = 30;
/** Набор ключей вопроса в ответе: correctIndex в него не входит и попасть не может. */
const QUESTION_KEYS = ["id", "level", "options", "prompt", "skill"];
const OPTION_KEYS = ["id", "text"];

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

/** Свежий аккаунт (результатов теста нет) и его сессия: каждый тест изолирован своим пользователем. */
async function freshSession(
    baseUrl: string
): Promise<{ readonly id: string; readonly email: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-fresh-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email);

    return { id, email, jar: await loginSession(baseUrl, email) };
}
/** Токен прямо из GoTrue: для прямой проверки грантов пользовательским клиентом. */
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

/** Строки результата из БД: идемпотентность проверяется по таблице, а не только по ответу (§16.5). */
async function dbResults(
    userId: string
): Promise<readonly { readonly level: string; readonly score: number }[]> {
    const { data, error } = await createAdminClient()
        .from("placement_results")
        .select("level, score")
        .eq("user_id", userId);

    if (error !== null) throw error;

    return data ?? [];
}

/**
 * Полный комплект ответов формы: `correct` первых заданий отвечены верно, остальные — заведомо неверно
 * (сдвиг варианта на один). Ожидаемые балл и уровень тесты задают литералами, поэтому формула проверяется,
 * а не повторяется за кодом.
 */
function answers(
    correct: number
): readonly { readonly questionId: string; readonly choice: number }[] {
    return QUESTIONS.map((question, index) => ({
        questionId: question.id,
        choice: index < correct ? question.correctIndex : (question.correctIndex + 1) % 4,
    }));
}

function errorBody(body: unknown): ErrorEnvelopeBody {
    return body as ErrorEnvelopeBody;
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
// возвращаем fail-closed дефолт, как это делает csrf.test.ts.
beforeEach(() => {
    configureCookies({ secure: false });
});

afterEach(() => {
    configureCookies({ secure: true });
});
describe("GET /api/placement", () => {
    it("1: отвечает 401 без куки и на поддельную куку, не светя токен", async () => {
        await withApp(async (app) => {
            const sentinel = "fake-placement-token-sentinel";
            const anonymous = await fetch(`${app.baseUrl}/api/placement`);
            const anonymousBody = errorBody(await anonymous.json());
            const forged = await fetch(`${app.baseUrl}/api/placement`, {
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

    it("2: отдаёт вопросы без верных ответов и completed=false до отправки", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await fetch(`${app.baseUrl}/api/placement`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const text = await response.text();
            const body = JSON.parse(text) as PlacementBody;

            expect(response.status).toBe(200);
            expect(Object.keys(body).sort()).toEqual(["completed", "questions", "result"]);
            expect(body.completed).toBe(false);
            expect(body.result).toBeNull();
            expect(body.questions).toHaveLength(TOTAL_QUESTIONS);
            // ARCHITECT: верный ответ не покидает сервер: в теле нет ни correctIndex, ни слова correct.
            expect(text).not.toContain("correct");

            for (const question of body.questions ?? []) {
                expect(Object.keys(question).sort()).toEqual(QUESTION_KEYS);
                expect(question.options).toHaveLength(4);

                for (const option of question.options) {
                    expect(Object.keys(option).sort()).toEqual(OPTION_KEYS);
                }
            }

            // ARCHITECT: первое задание формы — A1 grammar, как в банке (порядок показа: A1..C2).
            expect(body.questions?.[0]?.prompt).toBe("Tom ___ a new bicycle.");
            expect(body.questions?.[0]?.options.map((option) => option.text)).toEqual([
                "have",
                "has",
                "having",
                "is have",
            ]);
        });
    }, 30_000);

    it("10: чтение ограничено шестьюдесятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = { cookie: cookieHeader(me.jar) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 60; attempt += 1) {
                const response = await fetch(`${app.baseUrl}/api/placement`, { headers });

                attempted.push(response.status);
            }

            const limited = await fetch(`${app.baseUrl}/api/placement`, { headers });

            expect(attempted).toEqual(Array.from({ length: 60 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);
});
describe("POST /api/placement", () => {
    it("3: считает балл и уровень сам, затем отдаёт результат на GET", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            // ARCHITECT: 18 верных из 30 — это 60 баллов и полоса B2 (60-74): ожидания заданы литералами,
            // поэтому формула и полосы проверяются, а не повторяются за кодом.
            const response = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(18) },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as ResultBody;

            expect(response.status).toBe(200);
            expect(Object.keys(body)).toEqual(["result"]);
            expect(body.result.score).toBe(60);
            expect(body.result.level).toBe("B2");
            expect(Number.isNaN(Date.parse(body.result.createdAt))).toBe(false);

            const read = await fetch(`${app.baseUrl}/api/placement`, {
                headers: { cookie: cookieHeader(me.jar) },
            });
            const readBody = (await read.json()) as PlacementBody;

            expect(readBody.completed).toBe(true);
            expect(readBody.result).toEqual(body.result);
            // ARCHITECT: в БД сохранён именно серверный результат (§16.5).
            expect(await dbResults(me.id)).toEqual([{ level: "B2", score: 60 }]);
        });
    }, 30_000);

    it("4: отклоняет 400 клиентские score, level и userId", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const valid = answers(0);
            const invalidBodies: readonly unknown[] = [
                { answers: valid, score: 100 },
                { answers: valid, level: "C2" },
                { answers: valid, userId: me.id },
                { answers: valid, id: me.id },
                {},
            ];

            for (const body of invalidBodies) {
                const response = await postJson(app.baseUrl, "/api/placement", body, headers);

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            // ARCHITECT: ни один отклонённый запрос не создал строку: балл и уровень считает только сервер.
            expect(await dbResults(me.id)).toEqual([]);
        });
    }, 30_000);

    it("5: отклоняет 400 неполный, дублирующий, лишний и неверный комплект ответов", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const full = answers(0);
            const incomplete = full.slice(0, TOTAL_QUESTIONS - 1);
            const duplicated = [...full.slice(0, TOTAL_QUESTIONS - 1), full[0]];
            const unknown = [
                ...full.slice(0, TOTAL_QUESTIONS - 1),
                { ...full[0], questionId: "grammar_zz_1" },
            ];
            const oversized = [...full, { ...full[0] }];
            // ARCHITECT: «отвечу только то, что знаю» — подмножество A1+A2: форма отвечается целиком, иначе
            // клиент считал бы балл по выгодному ему набору (чит закрыт).
            const easyOnly = QUESTIONS.filter(
                (question) => question.level === "A1" || question.level === "A2"
            ).map((question) => ({ questionId: question.id, choice: question.correctIndex }));
            const invalidBodies: readonly unknown[] = [
                { answers: incomplete },
                { answers: duplicated },
                { answers: unknown },
                { answers: oversized },
                { answers: easyOnly },
                { answers: [] },
                { answers: full.map((answer) => ({ ...answer, choice: 4 })) },
                { answers: full.map((answer) => ({ ...answer, choice: -1 })) },
                { answers: full.map((answer) => ({ ...answer, choice: 1.5 })) },
            ];

            for (const body of invalidBodies) {
                const response = await postJson(app.baseUrl, "/api/placement", body, headers);

                expect(response.status).toBe(400);
                expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            }

            expect(await dbResults(me.id)).toEqual([]);
        });
    }, 30_000);

    it("6: повторная отправка идемпотентна — тот же результат и одна строка", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const first = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(9) },
                headers
            );
            const second = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(30) },
                headers
            );
            const firstBody = (await first.json()) as ResultBody;
            const secondBody = (await second.json()) as ResultBody;

            expect(first.status).toBe(200);
            expect(firstBody.result.score).toBe(30);
            expect(firstBody.result.level).toBe("A2");
            // ARCHITECT: второй набор ответов ничего не меняет: результат у пользователя один.
            expect(second.status).toBe(200);
            expect(secondBody).toEqual(firstBody);
            expect(await dbResults(me.id)).toHaveLength(1);
        });
    }, 30_000);
});
describe("владение, лимиты и гранты /api/placement", () => {
    it("7: результат пишется только своему user_id, чужой виден не будет", async () => {
        await withApp(async (app) => {
            const alice = await freshSession(app.baseUrl);
            const bob = await freshSession(app.baseUrl);
            const tampered = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(12), userId: bob.id },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            // ARCHITECT: чужой userId в теле отклоняется схемой, а не «почти принимается» (§16.2).
            expect(tampered.status).toBe(400);
            expect(await dbResults(bob.id)).toEqual([]);

            const own = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(12) },
                mutationHeaders(alice.jar, app.baseUrl)
            );

            expect(own.status).toBe(200);
            expect(await dbResults(alice.id)).toHaveLength(1);
            expect(await dbResults(bob.id)).toEqual([]);

            // ARCHITECT: чтение идёт под RLS select-own: чужой результат не видно (§16.5).
            const bobRead = await fetch(`${app.baseUrl}/api/placement`, {
                headers: { cookie: cookieHeader(bob.jar) },
            });
            const bobBody = (await bobRead.json()) as PlacementBody;

            expect(bobBody.completed).toBe(false);
            expect(bobBody.result).toBeNull();
        });
    }, 30_000);

    it("8: отправка ограничена десятью запросами за 15 минут", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const body = { answers: answers(1) };
            const attempted: number[] = [];

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const response = await postJson(app.baseUrl, "/api/placement", body, headers);

                attempted.push(response.status);
            }

            const limited = await postJson(app.baseUrl, "/api/placement", body, headers);

            expect(attempted).toEqual(Array.from({ length: 10 }, () => 200));
            expect(limited.status).toBe(429);
            expect(errorBody(await limited.json()).error.code).toBe("RATE_LIMITED");
            expect(limited.headers.get("retry-after")).toBeTruthy();
        });
    }, 60_000);

    it("9: клиент не пишет placement_results напрямую, но читает свой результат", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            // ARCHITECT: 15 верных из 30 — 50 баллов и полоса B1: подтверждает, что балл в БД серверный.
            const submitted = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(15) },
                mutationHeaders(me.jar, app.baseUrl)
            );

            expect(submitted.status).toBe(200);

            const user = createUserClient(await accessTokenFor(me.email));
            const deniedInsert = await user
                .from("placement_results")
                .insert({ user_id: me.id, level: "C2", score: 100 });
            const deniedUpdate = await user
                .from("placement_results")
                .update({ score: 100 })
                .eq("user_id", me.id);
            const own = await user
                .from("placement_results")
                .select("level, score")
                .eq("user_id", me.id);

            // ARCHITECT: у authenticated есть только select (grant + RLS select-own): уровень себе не
            // выставить в обход сервера (§16.5).
            expect(deniedInsert.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
            expect(deniedUpdate.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
            expect(own.error).toBeNull();
            expect(own.data).toEqual([{ level: "B1", score: 50 }]);
        });
    }, 30_000);
});

describe("скоринг уровня", () => {
    it("11: доля верных ответов и полосы шкалы 0-100", () => {
        const first = QUESTIONS[0];

        expect(computePlacement([{ questionId: first.id, choice: first.correctIndex }])).toEqual({
            score: 100,
            level: "C2",
        });
        // ARCHITECT: знаменатель — отправленные ответы, поэтому неверный ответ засчитывается как ноль.
        expect(
            computePlacement([
                { questionId: first.id, choice: first.correctIndex },
                { questionId: first.id, choice: first.correctIndex },
            ])
        ).toEqual({ score: 100, level: "C2" });
        expect(computePlacement([{ questionId: first.id, choice: -1 }])).toEqual({
            score: 0,
            level: "A1",
        });
        expect(computePlacement([])).toEqual({ score: 0, level: "A1" });
        // ARCHITECT: чужой id здесь молча не засчитывается (маршрут такие тела отклоняет до скоринга).
        expect(
            computePlacement([
                { questionId: first.id, choice: first.correctIndex },
                { questionId: "grammar_zz_1", choice: first.correctIndex },
            ])
        ).toEqual({ score: 50, level: "B1" });

        const bands: readonly (readonly [number, string])[] = [
            [0, "A1"],
            [19, "A1"],
            [20, "A2"],
            [39, "A2"],
            [40, "B1"],
            [59, "B1"],
            [60, "B2"],
            [74, "B2"],
            [75, "C1"],
            [89, "C1"],
            [90, "C2"],
            [100, "C2"],
        ];

        for (const [score, level] of bands) {
            expect(levelForScore(score)).toBe(level);
        }
    });

    it("13: калибровка формы — набор по уровням даёт ожидаемую полосу", () => {
        /** Ответы формы: уровни из `solid` верны целиком, `partial` — первые три задания уровня. */
        const solved = (solid: readonly string[], partial?: string): readonly PlacementAnswer[] => {
            const half = new Set(
                QUESTIONS.filter((question) => question.level === partial)
                    .slice(0, 3)
                    .map((question) => question.id)
            );

            return QUESTIONS.map((question) => ({
                questionId: question.id,
                choice:
                    solid.includes(question.level) || half.has(question.id)
                        ? question.correctIndex
                        : (question.correctIndex + 1) % 4,
            }));
        };

        // Только бытовой уровень: 5 верных из 30 — 17 баллов, полоса A1.
        expect(computePlacement(solved(["A1"]))).toEqual({ score: 17, level: "A1" });
        // A1 и A2 целиком, остальное неверно: 10 верных из 30 — 33 балла, полоса A2.
        expect(computePlacement(solved(["A1", "A2"]))).toEqual({ score: 33, level: "A2" });
        // A1 + A2 + половина B1 (3 задания из 5): 13 верных из 30 — 43 балла, полоса B1.
        expect(computePlacement(solved(["A1", "A2"], "B1"))).toEqual({ score: 43, level: "B1" });
        // Вся форма: 30 верных — 100 баллов, полоса C2.
        expect(computePlacement(solved(["A1", "A2", "B1", "B2", "C1", "C2"]))).toEqual({
            score: 100,
            level: "C2",
        });
    });
});

describe("форма и один результат на пользователя", () => {
    it("14: форма зафиксирована: 30 заданий, по 2 grammar и 3 general на уровень", () => {
        expect(QUESTIONS).toHaveLength(TOTAL_QUESTIONS);
        expect(QUESTION_IDS.size).toBe(TOTAL_QUESTIONS);
        expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(TOTAL_QUESTIONS);

        for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
            const group = QUESTIONS.filter((question) => question.level === level);

            expect(group).toHaveLength(5);
            expect(group.filter((question) => question.skill === "grammar")).toHaveLength(2);
            expect(group.filter((question) => question.skill === "general")).toHaveLength(3);
        }

        for (const question of QUESTIONS) {
            // ARCHITECT: рубрика формы: ровно четыре разных варианта, верный — один из них, стем не пустой.
            expect(question.options).toHaveLength(4);
            expect(question.correctIndex).toBeGreaterThanOrEqual(0);
            expect(question.correctIndex).toBeLessThanOrEqual(3);
            expect(new Set(question.options.map((option) => option.text)).size).toBe(4);
            expect(question.prompt.trim().length).toBeGreaterThan(0);
        }
    });

    it("15: порядок ответов не важен — комплект тот же", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const response = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: [...answers(15)].reverse() },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as ResultBody;

            // ARCHITECT: скоринг идёт по id, поэтому перемешанный комплект даёт тот же балл.
            expect(response.status).toBe(200);
            expect(body.result.score).toBe(50);
            expect(body.result.level).toBe("B1");
        });
    }, 30_000);

    it("16: второй результат для того же пользователя не создаётся — unique index", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            const headers = mutationHeaders(me.jar, app.baseUrl);
            const submitted = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(18) },
                headers
            );
            const body = (await submitted.json()) as ResultBody;

            expect(submitted.status).toBe(200);
            expect(body.result.score).toBe(60);

            // ARCHITECT: прямой insert второй строки упирается в placement_results_user_id_unique — та же
            // защита срабатывает при гонке двух одновременных отправок (§16.9).
            const second = await createAdminClient()
                .from("placement_results")
                .insert({ user_id: me.id, level: "C2", score: 100 });

            expect(second.error?.code).toBe("23505");
            expect(await dbResults(me.id)).toEqual([{ level: "B2", score: 60 }]);

            // ARCHITECT: повторная отправка полного комплекта возвращает сохранённое и ничего не перезаписывает.
            const again = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(30) },
                headers
            );
            const againBody = (await again.json()) as ResultBody;

            expect(again.status).toBe(200);
            expect(againBody).toEqual(body);
            expect(await dbResults(me.id)).toEqual([{ level: "B2", score: 60 }]);
        });
    }, 30_000);

    it("17: готовый результат, записанный сервером напрямую, POST возвращает как есть", async () => {
        await withApp(async (app) => {
            const me = await freshSession(app.baseUrl);
            // ARCHITECT: форма теста не пересдаётся: если результат уже записан (например биллингом или
            // поддержкой), отправка ответов отдаёт именно его, а не пересчитывает заново.
            const inserted = await createAdminClient()
                .from("placement_results")
                .insert({ user_id: me.id, level: "C1", score: 80 })
                .select("level, score, created_at")
                .single();

            expect(inserted.error).toBeNull();

            const response = await postJson(
                app.baseUrl,
                "/api/placement",
                { answers: answers(30) },
                mutationHeaders(me.jar, app.baseUrl)
            );
            const body = (await response.json()) as ResultBody;

            expect(response.status).toBe(200);
            expect(body.result.level).toBe("C1");
            expect(body.result.score).toBe(80);
            expect(body.result.createdAt).toBe(inserted.data?.created_at);
            expect(await dbResults(me.id)).toEqual([{ level: "C1", score: 80 }]);
        });
    }, 30_000);

    it("18: банк заданий только на английском — кириллицы нет ни в стеме, ни в вариантах", () => {
        // ARCHITECT: банк — учебный контент, который показывается на любой локали: русские подсказки и варианты
        // сломали бы en/es и профессиональный формат теста. Regex в escape-форме, чтобы и тест оставался ASCII.
        const cyrillic = /[\u0400-\u04FF]/;

        for (const question of QUESTIONS) {
            expect(cyrillic.test(question.id)).toBe(false);
            expect(cyrillic.test(question.prompt)).toBe(false);

            for (const option of question.options) {
                expect(cyrillic.test(option.id)).toBe(false);
                expect(cyrillic.test(option.text)).toBe(false);
            }
        }
    });
});
