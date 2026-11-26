// ARCHITECT: POST /api/tts проверяется по реальному HTTP на локальном стеке: сессия берётся настоящим логином,
// поэтому 401, CSRF, тариф и лимитер проверяются на живом окружении, а не на заглушке. Сеть в тестах не
// поднимается: fetch подменяется только для openrouter.ai, а Supabase идёт на локальный стек (§16.14).
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TTS_MODEL, TTS_VOICE_BY_ID } from "../ai/tts.ts";
import { COOKIE_NAMES, configureCookies } from "../cookies.ts";
import { createAdminClient, readLocalStack } from "../test-stack.ts";
import {
    cookieHeader,
    createConfirmedUser,
    errorBody,
    fetchCsrfPair,
    loginSession,
    mutationHeaders,
    postJson,
    withApp as runWithApp,
} from "../test-http.ts";
import type { Jar, RunningApp } from "../test-http.ts";
import type { TtsEnv } from "./tts.ts";

const EMAIL_PREFIX = `tts-${randomUUID()}`;
const PASSWORD = `Tts-${randomUUID()}-1`;
/** Текст синтеза: обычная реплика, значение важно только длиной. */
const TEXT = "Nice work, keep going.";
const VOICE_ID = "en-US-female";
const AUDIO_BYTES = 32;

let env: TtsEnv | undefined;
/** Тела заказов, ушедших в шлюз: по ним проверяются модель, голос и формат. */
let sentBodies: Record<string, unknown>[] = [];
/** Ответ шлюза на очередной заказ: по умолчанию — валидное mp3. */
let providerReply: () => Response = () => audioResponse();

const realFetch = globalThis.fetch.bind(globalThis);

/** Отдаёт окружение стека и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctxEnv(): TtsEnv {
    if (env === undefined)
        throw new Error("local Supabase stack is not running: run npx supabase start");

    return env;
}

/** Приложение живёт один тест: лимиты в памяти экземпляра не перетекают в соседние проверки. */
function withApp(run: (app: RunningApp) => Promise<void>): Promise<void> {
    return runWithApp(ctxEnv(), run);
}

/** Ответ провайдера: тело и аудио-тип, которые ждёт маршрут. */
function audioResponse(bytes: number = AUDIO_BYTES): Response {
    return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
    });
}

/** Тариф ставит биллинг, поэтому в тесте строка entitlements правится админ-клиентом. */
async function setPlan(userId: string, plan: "free" | "pro"): Promise<void> {
    const admin = createAdminClient();
    // ARCHITECT: строка entitlements заводится лениво (RPC), поэтому в тесте она создаётся явно.
    const created = await admin.rpc("get_or_create_entitlements", { p_user_id: userId });

    if (created.error !== null) throw created.error;

    const updated = await admin.from("entitlements").update({ plan }).eq("user_id", userId);

    if (updated.error !== null) throw updated.error;
}

/** Свежий аккаунт с нужным тарифом и его сессия. */
async function userWithPlan(
    baseUrl: string,
    plan: "free" | "pro"
): Promise<{ readonly id: string; readonly jar: Jar }> {
    const email = `${EMAIL_PREFIX}-${randomUUID()}@example.test`;
    const id = await createConfirmedUser(email, PASSWORD);

    await setPlan(id, plan);

    return { id, jar: await loginSession(baseUrl, email, PASSWORD) };
}

/** Запрос синтеза: тело по схеме маршрута плюс возможные лишние поля для негативной проверки. */
function synthesize(
    app: RunningApp,
    jar: Jar,
    body: Record<string, unknown> = {}
): Promise<Response> {
    return postJson(
        app.baseUrl,
        "/api/tts",
        { text: TEXT, voiceId: VOICE_ID, ...body },
        mutationHeaders(jar, app.baseUrl)
    );
}

beforeAll(async () => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
        OPENROUTER_API_KEY: "sk-or-test-key",
    };
}, 30_000);

// ARCHITECT: уборка не должна прятать результат тестов: удаляются все аккаунты прогона по префиксу.
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
    sentBodies = [];
    providerReply = () => audioResponse();
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
        const url =
            typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

        if (!url.startsWith("https://openrouter.ai/")) return realFetch(input, init);

        sentBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);

        return providerReply();
    });
});

afterEach(() => {
    configureCookies({ secure: true });
    vi.unstubAllGlobals();
});

describe("POST /api/tts", () => {
    it("1: отвечает 401 без куки сессии и на поддельную куку, не светя токен", async () => {
        await withApp(async (app) => {
            const sentinel = "fake-tts-token-sentinel";
            const pair = await fetchCsrfPair(app.baseUrl);
            const body = { text: TEXT, voiceId: VOICE_ID };
            const anonymous = await postJson(
                app.baseUrl,
                "/api/tts",
                body,
                mutationHeaders(pair, app.baseUrl)
            );
            const forged = await postJson(
                app.baseUrl,
                "/api/tts",
                body,
                mutationHeaders({ ...pair, [COOKIE_NAMES.accessToken]: sentinel }, app.baseUrl)
            );
            const forgedText = await forged.text();

            expect(anonymous.status).toBe(401);
            expect(errorBody(await anonymous.json()).error.code).toBe("UNAUTHORIZED");
            expect(forged.status).toBe(401);
            // ARCHITECT: токен не возвращается клиенту ни в теле, ни в заголовках (§16.11).
            expect(forgedText).not.toContain(sentinel);
            expect(sentBodies).toHaveLength(0);
        });
    }, 30_000);

    it("2: отвечает 403 без CSRF-пары, даже с валидной сессией", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");
            const response = await fetch(`${app.baseUrl}/api/tts`, {
                method: "POST",
                headers: { "content-type": "application/json", cookie: cookieHeader(me.jar) },
                body: JSON.stringify({ text: TEXT, voiceId: VOICE_ID }),
            });

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(sentBodies).toHaveLength(0);
        });
    }, 30_000);

    it("3: лишние поля тела и чужой voiceId — 400, провайдер не вызывается", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");
            const extra = await synthesize(app, me.jar, {
                plan: "pro",
                userId: me.id,
                level: "C2",
            });
            const foreignVoice = await synthesize(app, me.jar, { voiceId: "ru-RU-female" });

            expect(extra.status).toBe(400);
            expect(errorBody(await extra.json()).error.code).toBe("BAD_REQUEST");
            expect(foreignVoice.status).toBe(400);
            // ARCHITECT: голос провайдера по произвольной строке не заказывается: allowlist — это каталог.
            expect(sentBodies).toHaveLength(0);
        });
    }, 30_000);

    it("4: текст длиннее лимита — 400", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");
            const response = await synthesize(app, me.jar, { text: "a".repeat(601) });

            expect(response.status).toBe(400);
            expect(errorBody(await response.json()).error.code).toBe("BAD_REQUEST");
            expect(sentBodies).toHaveLength(0);
        });
    }, 30_000);

    it("5: бесплатный тариф — 403, синтез не заказывается", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "free");
            const response = await synthesize(app, me.jar);

            expect(response.status).toBe(403);
            expect(errorBody(await response.json()).error.code).toBe("FORBIDDEN");
            expect(sentBodies).toHaveLength(0);
        });
    }, 30_000);

    it("6: pro получает mp3 в base64, в провайдер уходит allowlist-модель и голос из карты", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");
            const response = await synthesize(app, me.jar);
            const body = (await response.json()) as {
                readonly audio: string;
                readonly mimeType: string;
            };

            expect(response.status).toBe(200);
            expect(body.mimeType).toBe("audio/mpeg");
            // ARCHITECT: аудио приходит base64-строкой: клиент собирает data URL и играет его без блоба.
            expect(Buffer.from(body.audio, "base64").byteLength).toBe(AUDIO_BYTES);
            expect(sentBodies).toHaveLength(1);
            expect(sentBodies[0]).toMatchObject({
                model: TTS_MODEL,
                input: TEXT,
                voice: TTS_VOICE_BY_ID[VOICE_ID],
                response_format: "mp3",
            });
        });
    }, 30_000);

    it("7: отказ провайдера, пустое аудио и не-аудио тип — 500, а не тишина в плеере", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");

            providerReply = () => new Response("upstream failed", { status: 502 });

            const failed = await synthesize(app, me.jar);

            expect(failed.status).toBe(500);
            expect(errorBody(await failed.json()).error.code).toBe("INTERNAL");

            providerReply = () => audioResponse(0);

            expect((await synthesize(app, me.jar)).status).toBe(500);

            providerReply = () =>
                new Response(new Uint8Array(AUDIO_BYTES), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });

            expect((await synthesize(app, me.jar)).status).toBe(500);
        });
    }, 30_000);

    it("8: держит лимит синтеза — 21-й запрос за окно отвечает 429", async () => {
        await withApp(async (app) => {
            const me = await userWithPlan(app.baseUrl, "pro");
            let status = 0;

            for (let index = 0; index < 21; index += 1) {
                const response = await synthesize(app, me.jar);

                status = response.status;
                await response.text();
            }

            expect(status).toBe(429);
            expect(sentBodies).toHaveLength(20);
        });
    }, 60_000);
});
