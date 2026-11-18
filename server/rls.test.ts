// ARCHITECT: файл доказывает owner-only контур первой схемы: RLS пускает пользователя только к своим строкам,
// ни один пользовательский ключ не может писать в core learning, а удаление аккаунта уносит все его данные.
// Данные создаёт ТОЛЬКО service-role: так проверка повторяет реальный путь записи из Ф4.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminClient, createAnonClient, createUserClient, readLocalStack } from "./test-stack.ts";
import type { StackClient } from "./test-stack.ts";

interface Actor {
    readonly id: string;
    readonly client: StackClient;
}

interface RlsFixture {
    readonly admin: StackClient;
    readonly anon: StackClient;
    readonly actorA: Actor;
    readonly actorB: Actor;
    readonly sessionAId: string;
    readonly lessonAId: string;
    readonly messageIds: readonly string[];
}

/** Код Postgres «недостаточно прав»: у пользовательских ключей нет грантов на запись в эти таблицы. */
const INSUFFICIENT_PRIVILEGE = "42501";

// ARCHITECT: пароль генерируется на прогон: тестовые пользователи локальные и живут только до afterAll.
const PASSWORD = `rls-${randomUUID()}-pass`;

let fixture: RlsFixture | undefined;

function ctx(): RlsFixture {
    if (fixture === undefined) throw new Error("local Supabase stack is not running: run npx supabase start");

    return fixture;
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

/** Достаёт строковый id из ответа PostgREST: строка схемы здесь свободная, поэтому тип проверяется во время выполнения. */
function requireId(value: unknown, what: string): string {
    if (typeof value !== "string") throw new Error(`${what} не создан`);

    return value;
}

async function seedData(): Promise<RlsFixture> {
    const admin = createAdminClient();
    const actorA = await createActor(admin, "rls-a");
    const actorB = await createActor(admin, "rls-b");

    const session = await admin
        .from("sessions")
        .insert({ user_id: actorA.id, tutor_id: "blobatar-test", mode: "general" })
        .select("id")
        .single();

    if (session.error !== null || session.data === null) {
        throw session.error ?? new Error("сессия не создана");
    }

    const sessionId = requireId(session.data.id, "сессия");

    const lesson = await admin
        .from("lessons")
        .insert({ session_id: sessionId, daily_minutes: 20, plan: null })
        .select("id")
        .single();

    if (lesson.error !== null || lesson.data === null) {
        throw lesson.error ?? new Error("урок не создан");
    }

    const lessonId = requireId(lesson.data.id, "урок");

    const messages = await admin
        .from("messages")
        .insert([
            { lesson_id: lessonId, role: "user", content: "Привет, репетитор" },
            { lesson_id: lessonId, role: "assistant", content: "Привет! Начнём с простого вопроса." },
        ])
        .select("id");

    if (messages.error !== null || messages.data === null) {
        throw messages.error ?? new Error("сообщения не созданы");
    }

    return {
        admin,
        anon: createAnonClient(),
        actorA,
        actorB,
        sessionAId: sessionId,
        lessonAId: lessonId,
        messageIds: messages.data.map((row) => requireId(row.id, "сообщение")),
    };
}

beforeAll(async () => {
    readLocalStack();
    fixture = await seedData();
}, 30_000);

// ARCHITECT: уборка идемпотентна: аккаунт A мог быть удалён в тесте каскада, поэтому ошибки игнорируются.
afterAll(async () => {
    if (fixture === undefined) return;

    await fixture.admin.auth.admin.deleteUser(fixture.actorA.id);
    await fixture.admin.auth.admin.deleteUser(fixture.actorB.id);
});

describe("owner-only RLS первой схемы", () => {
    it("создаёт профиль триггером при регистрации", async () => {
        const { actorA } = ctx();
        const { data, error } = await actorA.client.from("profiles").select("id").eq("id", actorA.id);

        expect(error).toBeNull();
        expect(data).toHaveLength(1);
    }, 15_000);

    it("не показывает чужой профиль", async () => {
        const { actorA, actorB } = ctx();
        const { data, error } = await actorA.client.from("profiles").select("id").eq("id", actorB.id);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);
    }, 15_000);

    it("не пускает анонима к profiles", async () => {
        const { anon } = ctx();
        const { error } = await anon.from("profiles").select("id");

        expect(error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("разрешает править профильные колонки и блокирует смену id", async () => {
        const { actorA } = ctx();
        const before = await actorA.client.from("profiles").select("updated_at").eq("id", actorA.id).single();

        expect(before.error).toBeNull();

        const renamed = await actorA.client
            .from("profiles")
            .update({ display_name: "rls-renamed" })
            .eq("id", actorA.id)
            .select("display_name, updated_at")
            .single();

        expect(renamed.error).toBeNull();
        expect(renamed.data?.display_name).toBe("rls-renamed");
        expect(renamed.data?.updated_at).not.toBe(before.data?.updated_at);

        const idChange = await actorA.client
            .from("profiles")
            .update({ id: randomUUID() })
            .eq("id", actorA.id)
            .select("id");

        expect(idChange.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("не правит чужой профиль", async () => {
        const { actorA, actorB } = ctx();
        const { data, error } = await actorA.client
            .from("profiles")
            .update({ display_name: "not-mine" })
            .eq("id", actorB.id)
            .select("id");

        expect(error).toBeNull();
        expect(data).toHaveLength(0);
    }, 15_000);

    it("показывает сессии только владельцу", async () => {
        const { actorA, actorB, anon, sessionAId } = ctx();
        const mine = await actorA.client.from("sessions").select("id").eq("id", sessionAId);
        const foreign = await actorB.client.from("sessions").select("id").eq("id", sessionAId);
        const anonymous = await anon.from("sessions").select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("запрещает пользователю создавать и удалять сессии", async () => {
        const { actorA, sessionAId } = ctx();
        const inserted = await actorA.client
            .from("sessions")
            .insert({ user_id: actorA.id, tutor_id: "blobatar-test", mode: "general" })
            .select("id");
        const deleted = await actorA.client.from("sessions").delete().eq("id", sessionAId).select("id");

        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(deleted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("показывает урок владельцу сессии и запрещает его создание и правку", async () => {
        const { actorA, actorB, sessionAId, lessonAId } = ctx();
        const mine = await actorA.client.from("lessons").select("id").eq("id", lessonAId);
        const foreign = await actorB.client.from("lessons").select("id").eq("id", lessonAId);
        const inserted = await actorA.client
            .from("lessons")
            .insert({ session_id: sessionAId, daily_minutes: 20, plan: null })
            .select("id");
        const updated = await actorA.client
            .from("lessons")
            .update({ status: "paused" })
            .eq("id", lessonAId)
            .select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(updated.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("показывает сообщения владельцу и запрещает писать их напрямую", async () => {
        const { actorA, actorB, anon, lessonAId, messageIds } = ctx();
        const mine = await actorA.client.from("messages").select("id").eq("lesson_id", lessonAId);
        const foreign = await actorB.client.from("messages").select("id").eq("lesson_id", lessonAId);
        const anonymous = await anon.from("messages").select("id");
        const inserted = await actorA.client
            .from("messages")
            .insert({ lesson_id: lessonAId, role: "user", content: "обход счётчика" })
            .select("id");

        expect(messageIds).toHaveLength(2);
        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(2);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        // ARCHITECT: главный негатив: дописать сообщение в свой же урок нельзя — квоту невозможно обойти мимо сервера.
        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("уносит все данные пользователя при удалении аккаунта", async () => {
        const { admin, actorA, sessionAId, lessonAId } = ctx();
        const removed = await admin.auth.admin.deleteUser(actorA.id);

        expect(removed.error).toBeNull();

        const profiles = await admin.from("profiles").select("id").eq("id", actorA.id);
        const sessions = await admin.from("sessions").select("id").eq("user_id", actorA.id);
        const lessons = await admin.from("lessons").select("id").eq("session_id", sessionAId);
        const messages = await admin.from("messages").select("id").eq("lesson_id", lessonAId);

        expect(profiles.data).toHaveLength(0);
        expect(sessions.data).toHaveLength(0);
        expect(lessons.data).toHaveLength(0);
        expect(messages.data).toHaveLength(0);
    }, 15_000);
});
