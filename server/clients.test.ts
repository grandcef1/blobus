// ARCHITECT: тесты фабрик клиентов не переключают окружение: общий setup-файл (src/test/setup.ts) трогает
// window, а нужные здесь Node-API (execFileSync, fetch) в jsdom доступны. Значения окружения берутся из
// ./test-stack.ts, то есть из локального стека, а не из реальных .env.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServiceClient, createUserClient } from "./supabase.ts";
import type { SupabaseEnv, SupabaseServerClient } from "./supabase.ts";
import { createAnonClient, readLocalStack } from "./test-stack.ts";

interface ClientsFixture {
    readonly env: SupabaseEnv;
    readonly service: SupabaseServerClient;
    readonly user: SupabaseServerClient;
    readonly userId: string;
}

// ARCHITECT: пароль генерируется на прогон: тестовый пользователь локальный и живёт только до afterAll.
const PASSWORD = `clients-${randomUUID()}-pass`;

let fixture: ClientsFixture | undefined;

function ctx(): ClientsFixture {
    if (fixture === undefined) throw new Error("local Supabase stack is not running: run npx supabase start");

    return fixture;
}

beforeAll(async () => {
    const stack = readLocalStack();
    const env: SupabaseEnv = {
        SUPABASE_URL: stack.url,
        SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
        SUPABASE_SECRET_KEY: stack.secretKey,
    };
    const service = createServiceClient(env);
    const email = `clients-a-${randomUUID()}@example.test`;
    const created = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });

    if (created.error !== null || created.data.user === null) {
        throw created.error ?? new Error("пользователь не создан");
    }

    const signedIn = await createAnonClient().auth.signInWithPassword({ email, password: PASSWORD });

    if (signedIn.error !== null || signedIn.data.session === null) {
        throw signedIn.error ?? new Error("вход не удался");
    }

    fixture = {
        env,
        service,
        user: createUserClient(env, signedIn.data.session.access_token),
        userId: created.data.user.id,
    };
}, 30_000);

// ARCHITECT: уборка идемпотентна: пользователь удаляется сервисным клиентом, ошибки игнорируются.
afterAll(async () => {
    if (fixture === undefined) return;

    await fixture.service.auth.admin.deleteUser(fixture.userId);
});

describe("фабрики клиентов Supabase", () => {
    it("даёт сервисному клиенту админский доступ к пользователям", async () => {
        const { service } = ctx();
        const { data, error } = await service.auth.admin.listUsers();

        expect(error).toBeNull();
        expect(Array.isArray(data.users)).toBe(true);
    }, 15_000);

    it("возвращает пользовательскому клиенту того же пользователя", async () => {
        const { user, userId } = ctx();
        const { data, error } = await user.auth.getUser();

        expect(error).toBeNull();
        expect(data.user?.id).toBe(userId);
    }, 15_000);

    it("показывает пользовательскому клиенту ровно свой профиль", async () => {
        const { user, userId } = ctx();
        const own = await user.from("profiles").select("id").eq("id", userId);
        const all = await user.from("profiles").select("id");

        expect(own.error).toBeNull();
        expect(own.data).toHaveLength(1);
        expect(own.data?.[0]?.id).toBe(userId);

        // ARCHITECT: RLS не даёт увидеть чужие профили: пользовательский клиент видит только свою строку.
        expect(all.error).toBeNull();
        expect(all.data).toHaveLength(1);
    }, 15_000);

    it("не даёт мусорному токену пользователя и чужих профилей", async () => {
        const { env, userId } = ctx();
        const forged = createUserClient(env, "garbage-token-sentinel");
        const whoami = await forged.auth.getUser();
        const profiles = await forged.from("profiles").select("id").neq("id", userId);

        expect(whoami.error !== null || whoami.data.user === null).toBe(true);
        expect(profiles.data ?? []).toHaveLength(0);
    }, 15_000);

    it("видит сервисным клиентом не меньше профилей, чем пользователь у себя", async () => {
        const { service, user } = ctx();
        const all = await service.from("profiles").select("id");
        const own = await user.from("profiles").select("id");

        expect(all.error).toBeNull();
        expect(own.error).toBeNull();
        expect((all.data ?? []).length).toBeGreaterThanOrEqual((own.data ?? []).length);
        expect((all.data ?? []).length).toBeGreaterThanOrEqual(1);
    }, 15_000);
});
