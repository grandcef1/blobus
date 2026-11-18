// ARCHITECT: тесты идут против локального стека Supabase, который поднимает владелец (npx supabase start).
// Окружение не переключаем на node: общий setup-файл (src/test/setup.ts) трогает window, а нужный здесь
// fetch в jsdom доступен. Адрес и ключи приходят из ./test-stack.ts — источник один, `supabase status`.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryTokenCache, verifyAccessToken } from "./auth.ts";
import type { TokenPayload } from "./auth.ts";
import type { SupabaseEnv } from "./supabase.ts";
import { createAdminClient, createAnonClient, readLocalStack } from "./test-stack.ts";

// ARCHITECT: шпион лежит в hoisted-объекте: фабрика vi.mock поднимается выше импортов и обычных констант
// теста не видит, а счётчик обращений к Supabase — то, что доказывают тесты кэша.
const getUserMock = vi.hoisted(() => vi.fn());

vi.mock("./supabase.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./supabase.ts")>();

    return {
        ...actual,
        // ARCHITECT: заглушка делегирует настоящему клиенту: проверка токена остаётся реальной, а её
        // вызовы видны тесту.
        createUserClient: (env: SupabaseEnv, token: string) => {
            const client = actual.createUserClient(env, token);

            getUserMock.mockImplementation(() => client.auth.getUser());

            return { auth: { getUser: getUserMock } } as unknown as typeof client;
        },
    };
});

// ARCHITECT: пароль генерируется на прогон: тестовый пользователь локальный и живёт только до afterAll.
const PASSWORD = `auth-${randomUUID()}-pass`;
const FAKE_TOKEN = "fake-token-sentinel";

let env: SupabaseEnv | undefined;
let userId: string | undefined;
let userEmail: string | undefined;
let accessToken: string | undefined;

/** Отдаёт созданные значения и падает громко: пропуск тестов скрыл бы поломку окружения. */
function ctx(): { env: SupabaseEnv; userId: string; userEmail: string; accessToken: string } {
    if (env === undefined || userId === undefined || userEmail === undefined || accessToken === undefined) {
        throw new Error("local Supabase stack is not running: run npx supabase start");
    }

    return { env, userId, userEmail, accessToken };
}

/** Ошибка отклонённого промиса: негативные тесты проверяют её текст, а не стек. */
async function rejectionOf(call: Promise<unknown>): Promise<Error> {
    const failure = await call.then(
        () => undefined,
        (error: unknown) => error
    );

    if (failure instanceof Error) return failure;

    throw new Error("проверка не отклонилась с Error");
}

/** Токен формы JWT с заданным exp: подпись невалидна, поэтому Supabase Auth такой токен отвергает. */
function tokenWithExpiry(exp: number): string {
    const part = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");

    return `${part({ alg: "HS256", typ: "JWT" })}.${part({ aud: "authenticated", exp, sub: userId })}.signature`;
}

beforeAll(async () => {
    const stack = readLocalStack();

    env = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };

    const email = `auth-a-${randomUUID()}@example.test`;
    const created = await createAdminClient().auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
    });

    if (created.error !== null || created.data.user === null) {
        throw created.error ?? new Error("createUser не вернул пользователя");
    }

    userId = created.data.user.id;
    userEmail = email;

    const signedIn = await createAnonClient().auth.signInWithPassword({ email, password: PASSWORD });

    if (signedIn.error !== null || signedIn.data.session === null) {
        throw signedIn.error ?? new Error("signInWithPassword не вернул сессию");
    }

    accessToken = signedIn.data.session.access_token;
}, 30_000);

// ARCHITECT: уборка не должна прятать результат тестов: ошибку удаления пользователя игнорируем.
afterAll(async () => {
    if (userId === undefined) return;

    await createAdminClient()
        .auth.admin.deleteUser(userId)
        .catch(() => undefined);
}, 15_000);

beforeEach(() => {
    getUserMock.mockClear();
});

describe("проверка access-токена", () => {
    it("отдаёт userId и email пользователя, вошедшего по токену", async () => {
        const { env: stackEnv, accessToken: token, userId: expectedId, userEmail: expectedEmail } = ctx();
        const payload = await verifyAccessToken(stackEnv, token);

        expect(payload.userId).toBe(expectedId);
        expect(payload.email).toBe(expectedEmail);
        expect(payload.aud).toBe("authenticated");
        expect(payload.exp * 1000).toBeGreaterThan(Date.now());
        expect(getUserMock).toHaveBeenCalledTimes(1);
    }, 15_000);

    it("берёт повторную проверку из кэша и не ходит в Supabase", async () => {
        const { env: stackEnv, accessToken: token } = ctx();
        const cache = createInMemoryTokenCache();
        const first = await verifyAccessToken(stackEnv, token, cache);

        expect(getUserMock).toHaveBeenCalledTimes(1);

        const second = await verifyAccessToken(stackEnv, token, cache);

        expect(getUserMock).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
    }, 15_000);

    it("отвергает поддельный токен, не раскрывая его текст", async () => {
        const { env: stackEnv } = ctx();
        const failure = await rejectionOf(verifyAccessToken(stackEnv, FAKE_TOKEN));

        expect(failure.message).toBe("INVALID_TOKEN");
        expect(failure.message).not.toContain(FAKE_TOKEN);
        expect(getUserMock).not.toHaveBeenCalled();
    }, 15_000);

    it("истекает по ttl кэша и проверяет токен заново", async () => {
        const { env: stackEnv, accessToken: token } = ctx();
        const cache = createInMemoryTokenCache(100);
        await verifyAccessToken(stackEnv, token, cache);

        expect(getUserMock).toHaveBeenCalledTimes(1);

        await new Promise((resolve) => setTimeout(resolve, 150));

        await verifyAccessToken(stackEnv, token, cache);

        expect(getUserMock).toHaveBeenCalledTimes(2);
    }, 15_000);

    it("не отдаёт из кэша запись с прошедшим exp", async () => {
        const { env: stackEnv, userId: id } = ctx();
        const exp = Math.floor(Date.now() / 1000) - 60;
        const expired = tokenWithExpiry(exp);
        const payload: TokenPayload = { userId: id, email: null, aud: "authenticated", exp };
        const cache = createInMemoryTokenCache();

        cache.set(expired, { payload, expiresAt: exp * 1000 });

        expect(cache.get(expired)).toBeUndefined();

        const failure = await rejectionOf(verifyAccessToken(stackEnv, expired, cache));

        expect(failure.message).toBe("INVALID_TOKEN");
        expect(cache.get(expired)).toBeUndefined();
        expect(getUserMock).toHaveBeenCalledTimes(1);
    }, 15_000);

    it("отвергает пустой токен", async () => {
        const { env: stackEnv } = ctx();
        const failure = await rejectionOf(verifyAccessToken(stackEnv, ""));

        expect(failure.message).toBe("INVALID_TOKEN");
        expect(getUserMock).not.toHaveBeenCalled();
    }, 15_000);
});

