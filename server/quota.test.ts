// ARCHITECT: файл доказывает, что квоты нельзя пробить: резерв атомарен в БД (SELECT ... FOR UPDATE),
// release возвращает неудачный резерв, сброс идёт по дате, а вызывать RPC может только service-role.
// Главный негатив — параллельные запросы: лимит не превышается даже в Promise.all.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminClient, createAnonClient, createUserClient, readLocalStack } from "./test-stack.ts";
import type { StackClient } from "./test-stack.ts";

interface Actor {
    readonly id: string;
    readonly client: StackClient;
}

interface QuotaFixture {
    readonly admin: StackClient;
    readonly anon: StackClient;
    readonly actorA: Actor;
    readonly actorB: Actor;
}

interface QuotaRemaining {
    readonly lessons_remaining: number;
    readonly messages_remaining: number;
}

interface UsageSnapshot {
    readonly lessons_used: number;
    readonly messages_used: number;
}

const QUOTA_LESSONS = "QUOTA_EXHAUSTED:lessons";
const QUOTA_MESSAGES = "QUOTA_EXHAUSTED:messages";
const QUOTA_SQLSTATE = "P0001";
const DENIED = "42501";
const FREE_LESSONS = 1;
const FREE_MESSAGES = 20;
const PRO_LESSONS = 10;
const PRO_MESSAGES = 300;

// ARCHITECT: пароль генерируется на прогон: тестовые пользователи локальные и живут только до afterAll.
const PASSWORD = `quota-${randomUUID()}-pass`;

let fixture: QuotaFixture | undefined;

function ctx(): QuotaFixture {
    if (fixture === undefined) throw new Error("local Supabase stack is not running: run npx supabase start");

    return fixture;
}

/** Разбирает jsonb-ответ RPC с проверкой формы: тип Json слишком широк, чтобы доверять ему в ассертах. */
function asRemaining(value: unknown): QuotaRemaining {
    if (typeof value !== "object" || value === null) throw new Error("RPC вернул не объект");

    const record = value as Record<string, unknown>;
    const lessons = record.lessons_remaining;
    const messages = record.messages_remaining;

    if (typeof lessons !== "number" || typeof messages !== "number") throw new Error("RPC вернул неожиданную форму");

    return { lessons_remaining: lessons, messages_remaining: messages };
}

/** Разбирает jsonb-ответ release_* с проверкой формы. */
function asUsage(value: unknown): UsageSnapshot {
    if (typeof value !== "object" || value === null) throw new Error("RPC вернул не объект");

    const record = value as Record<string, unknown>;
    const lessons = record.lessons_used;
    const messages = record.messages_used;

    if (typeof lessons !== "number" || typeof messages !== "number") throw new Error("RPC вернул неожиданную форму");

    return { lessons_used: lessons, messages_used: messages };
}

async function expectQuotaError(
    call: PromiseLike<{ error: { message: string; code: string } | null }>,
    marker: string
): Promise<void> {
    const { error } = await call;

    expect(error).not.toBeNull();
    expect(error?.code).toBe(QUOTA_SQLSTATE);
    expect(error?.message).toContain(marker);
}

async function createActor(admin: StackClient, prefix: string): Promise<Actor> {
    const email = `${prefix}-${randomUUID()}@example.test`;
    const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });

    if (created.error !== null || created.data.user === null) {
        throw created.error ?? new Error("createUser не вернул пользователя");
    }

    const signedIn = await createAnonClient().auth.signInWithPassword({ email, password: PASSWORD });

    if (signedIn.error !== null || signedIn.data.session === null) {
        throw signedIn.error ?? new Error("signInWithPassword не вернул сессию");
    }

    return { id: created.data.user.id, client: createUserClient(signedIn.data.session.access_token) };
}

beforeAll(async () => {
    readLocalStack();
    const admin = createAdminClient();
    const actorA = await createActor(admin, "quota-a");
    const actorB = await createActor(admin, "quota-b");

    // ARCHITECT: тариф и счётчики заводит только service-role: у пользовательского ключа нет execute на RPC.
    const createdA = await admin.rpc("get_or_create_entitlements", { p_user_id: actorA.id });
    const createdB = await admin.rpc("get_or_create_entitlements", { p_user_id: actorB.id });

    if (createdA.error !== null) throw createdA.error;
    if (createdB.error !== null) throw createdB.error;

    fixture = { admin, anon: createAnonClient(), actorA, actorB };
}, 30_000);

// ARCHITECT: уборка идемпотентна: пользователи удаляются вместе со своими квотами по каскаду.
afterAll(async () => {
    if (fixture === undefined) return;

    await fixture.admin.auth.admin.deleteUser(fixture.actorA.id);
    await fixture.admin.auth.admin.deleteUser(fixture.actorB.id);
});

describe("квоты и атомарный резерв", () => {
    it("выдаёт free-лимит урока и падает на втором", async () => {
        const { admin, actorA } = ctx();
        const first = await admin.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(first.error).toBeNull();
        expect(asRemaining(first.data).lessons_remaining).toBe(FREE_LESSONS - 1);

        await expectQuotaError(admin.rpc("reserve_lesson", { p_user_id: actorA.id }), QUOTA_LESSONS);
    }, 15_000);

    it("возвращает резерв урока и разрешает новый", async () => {
        const { admin, actorA } = ctx();
        const released = await admin.rpc("release_lesson", { p_user_id: actorA.id });

        expect(released.error).toBeNull();
        expect(asUsage(released.data).lessons_used).toBe(0);

        const reserved = await admin.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(reserved.error).toBeNull();
        expect(asRemaining(reserved.data).lessons_remaining).toBe(FREE_LESSONS - 1);
    }, 15_000);

    it("считает сообщения до лимита и падает на следующем", async () => {
        const { admin, actorA } = ctx();

        for (let index = 0; index < FREE_MESSAGES - 1; index += 1) {
            const reserved = await admin.rpc("reserve_message", { p_user_id: actorA.id });

            expect(reserved.error).toBeNull();
        }

        const last = await admin.rpc("reserve_message", { p_user_id: actorA.id });

        expect(last.error).toBeNull();
        expect(asRemaining(last.data).messages_remaining).toBe(0);

        await expectQuotaError(admin.rpc("reserve_message", { p_user_id: actorA.id }), QUOTA_MESSAGES);
    }, 30_000);

    it("не пробивает лимит параллельными запросами", async () => {
        const { admin, actorA } = ctx();

        // ARCHITECT: освобождаем ровно пять мест, чтобы увидеть, как параллельные попытки упираются в остаток.
        for (let index = 0; index < 5; index += 1) {
            const released = await admin.rpc("release_message", { p_user_id: actorA.id });

            expect(released.error).toBeNull();
        }

        const results = await Promise.all(
            Array.from({ length: 10 }, () => admin.rpc("reserve_message", { p_user_id: actorA.id }))
        );
        const successes = results.filter((result) => result.error === null);
        const failures = results.filter((result) => result.error !== null);

        expect(successes).toHaveLength(5);
        expect(failures).toHaveLength(5);
        expect(successes.length + failures.length).toBe(10);

        for (const failure of failures) {
            expect(failure.error?.message).toContain(QUOTA_MESSAGES);
        }

        const counter = await admin
            .from("usage_counters")
            .select("messages_used")
            .eq("user_id", actorA.id)
            .order("date", { ascending: false })
            .limit(1)
            .single();

        expect(counter.error).toBeNull();
        expect(counter.data?.messages_used).toBe(FREE_MESSAGES);
        expect(counter.data?.messages_used ?? 0).toBeLessThanOrEqual(FREE_MESSAGES);
    }, 30_000);

    it("держит отдельные счётчики у второго пользователя", async () => {
        const { admin, actorB } = ctx();
        const reserved = await admin.rpc("reserve_lesson", { p_user_id: actorB.id });

        expect(reserved.error).toBeNull();
        expect(asRemaining(reserved.data).lessons_remaining).toBe(FREE_LESSONS - 1);
    }, 15_000);

    it("поднимает лимиты до pro и держит их", async () => {
        const { admin, actorA } = ctx();
        const updated = await admin
            .from("entitlements")
            .update({ plan: "pro", daily_lessons_limit: PRO_LESSONS, daily_messages_limit: PRO_MESSAGES })
            .eq("user_id", actorA.id)
            .select("id");
        const cleared = await admin.from("usage_counters").delete().eq("user_id", actorA.id);

        expect(updated.error).toBeNull();
        expect(updated.data).toHaveLength(1);
        expect(cleared.error).toBeNull();

        const lesson = await admin.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(lesson.error).toBeNull();
        expect(asRemaining(lesson.data).lessons_remaining).toBe(PRO_LESSONS - 1);

        for (let index = 0; index < PRO_MESSAGES; index += 1) {
            const reserved = await admin.rpc("reserve_message", { p_user_id: actorA.id });

            expect(reserved.error).toBeNull();
        }

        // ARCHITECT: при лимите 300 счётчик проверяется до инкремента, поэтому 300-я попытка успешна
        // (остаток 0), а падает следующая — так и должен работать guard «used < limit».
        await expectQuotaError(admin.rpc("reserve_message", { p_user_id: actorA.id }), QUOTA_MESSAGES);
    }, 60_000);

    it("сбрасывает счётчики новой строкой на новую дату", async () => {
        const { admin, actorA } = ctx();
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const cleared = await admin.from("usage_counters").delete().eq("user_id", actorA.id);

        expect(cleared.error).toBeNull();

        const seeded = await admin
            .from("usage_counters")
            .insert({ user_id: actorA.id, date: yesterday, lessons_used: 100 })
            .select("id");

        expect(seeded.error).toBeNull();

        const reserved = await admin.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(reserved.error).toBeNull();
        expect(asRemaining(reserved.data).lessons_remaining).toBe(PRO_LESSONS - 1);

        const rows = await admin.from("usage_counters").select("date, lessons_used").eq("user_id", actorA.id);
        const old = (rows.data ?? []).filter((row) => row.date === yesterday);
        const fresh = (rows.data ?? []).filter((row) => row.date !== yesterday);

        expect(rows.error).toBeNull();
        expect(rows.data).toHaveLength(2);
        expect(old).toHaveLength(1);
        expect(old[0]?.lessons_used).toBe(100);
        expect(fresh).toHaveLength(1);
        expect(fresh[0]?.lessons_used).toBe(1);
    }, 15_000);

    it("не падает при освобождении нулевого счётчика", async () => {
        const { admin, actorA } = ctx();
        const first = await admin.rpc("release_lesson", { p_user_id: actorA.id });
        const second = await admin.rpc("release_lesson", { p_user_id: actorA.id });

        expect(first.error).toBeNull();
        expect(second.error).toBeNull();
        expect(asUsage(second.data).lessons_used).toBe(0);
    }, 15_000);

    it("не даёт анониму вызвать RPC квот", async () => {
        const { anon, actorA } = ctx();
        const denied = await anon.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(denied.error).not.toBeNull();
        expect(denied.error?.code).toBe(DENIED);
        expect(denied.data).toBeNull();
    }, 15_000);

    it("не даёт обычному пользователю вызвать RPC квот", async () => {
        const { actorA } = ctx();
        const denied = await actorA.client.rpc("reserve_lesson", { p_user_id: actorA.id });

        expect(denied.error).not.toBeNull();
        expect(denied.error?.code).toBe(DENIED);
        expect(denied.data).toBeNull();
    }, 15_000);
});
