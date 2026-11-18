// ARCHITECT: файл доказывает owner-only контур второй схемы: словарь, замеры уровня, тикеты и ответы
// поддержки пользователь видит только свои, а пишет в них исключительно сервер через service-role.
// Данные создаёт ТОЛЬКО admin: так проверка повторяет реальный путь записи.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminClient, createAnonClient, createUserClient, readLocalStack } from "./test-stack.ts";
import type { StackClient } from "./test-stack.ts";

interface Actor {
    readonly id: string;
    readonly client: StackClient;
}

interface SupportFixture {
    readonly admin: StackClient;
    readonly anon: StackClient;
    readonly actorA: Actor;
    readonly actorB: Actor;
    readonly vocabularyAId: string;
    readonly lessonAId: string;
    readonly ticketAId: string;
    readonly ticketBId: string;
}

const INSUFFICIENT_PRIVILEGE = "42501";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

// ARCHITECT: пароль генерируется на прогон: тестовые пользователи локальные и живут только до afterAll.
const PASSWORD = `rls2-${randomUUID()}-pass`;

let fixture: SupportFixture | undefined;

function ctx(): SupportFixture {
    if (fixture === undefined) throw new Error("local Supabase stack is not running: run npx supabase start");

    return fixture;
}

/** Достаёт строковый id из ответа PostgREST: сгенерированная схема допускает null, поэтому проверяем тип. */
function requireId(value: unknown, what: string): string {
    if (typeof value !== "string") throw new Error(`${what} не создан`);

    return value;
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

async function seedData(): Promise<SupportFixture> {
    const admin = createAdminClient();
    const actorA = await createActor(admin, "rls2-a");
    const actorB = await createActor(admin, "rls2-b");

    const session = await admin
        .from("sessions")
        .insert({ user_id: actorA.id, tutor_id: "blobatar-test", mode: "general" })
        .select("id")
        .single();

    if (session.error !== null || session.data === null) throw session.error ?? new Error("сессия не создана");

    const lesson = await admin
        .from("lessons")
        .insert({ session_id: session.data.id, daily_minutes: 20, plan: null })
        .select("id")
        .single();

    if (lesson.error !== null || lesson.data === null) throw lesson.error ?? new Error("урок не создан");

    const lessonId = requireId(lesson.data.id, "урок");

    const vocabulary = await admin
        .from("vocabulary")
        .insert({
            user_id: actorA.id,
            term: "Serendipity",
            translation: "счастливая случайность",
            source_lesson_id: lessonId,
        })
        .select("id")
        .single();

    if (vocabulary.error !== null || vocabulary.data === null) throw vocabulary.error ?? new Error("слово не создано");

    const foreignWord = await admin
        .from("vocabulary")
        .insert({ user_id: actorB.id, term: "Focus" })
        .select("id")
        .single();

    if (foreignWord.error !== null) throw foreignWord.error;

    const placement = await admin
        .from("placement_results")
        .insert({ user_id: actorA.id, level: "B1", score: 72 })
        .select("id")
        .single();

    if (placement.error !== null) throw placement.error;

    const ticket = await admin
        .from("tickets")
        .insert({ user_id: actorA.id, subject: "Test ticket" })
        .select("id")
        .single();

    if (ticket.error !== null || ticket.data === null) throw ticket.error ?? new Error("тикет не создан");

    const ticketId = requireId(ticket.data.id, "тикет");

    const messages = await admin
        .from("ticket_messages")
        .insert([
            { ticket_id: ticketId, author: "user", content: "Сообщение не отправляется" },
            { ticket_id: ticketId, author: "support", content: "Проверьте соединение и обновите страницу" },
        ])
        .select("id");

    if (messages.error !== null || messages.data === null) throw messages.error ?? new Error("ответы не созданы");

    // ARCHITECT: у второго пользователя тоже есть тикет с ответом: иначе проверка каскада была бы вакуумной
    // для ticket_messages.
    const foreignTicket = await admin
        .from("tickets")
        .insert({ user_id: actorB.id, subject: "Test ticket B" })
        .select("id")
        .single();

    if (foreignTicket.error !== null || foreignTicket.data === null) {
        throw foreignTicket.error ?? new Error("тикет B не создан");
    }

    const ticketBId = requireId(foreignTicket.data.id, "тикет B");

    const foreignMessages = await admin
        .from("ticket_messages")
        .insert({ ticket_id: ticketBId, author: "user", content: "Вопрос от B" })
        .select("id");

    if (foreignMessages.error !== null) throw foreignMessages.error;

    return {
        admin,
        anon: createAnonClient(),
        actorA,
        actorB,
        vocabularyAId: requireId(vocabulary.data.id, "слово"),
        lessonAId: lessonId,
        ticketAId: ticketId,
        ticketBId,
    };
}

beforeAll(async () => {
    readLocalStack();
    fixture = await seedData();
}, 30_000);

// ARCHITECT: уборка идемпотентна: аккаунт B мог быть удалён в тесте каскада, поэтому ошибки игнорируются.
afterAll(async () => {
    if (fixture === undefined) return;

    await fixture.admin.auth.admin.deleteUser(fixture.actorA.id);
    await fixture.admin.auth.admin.deleteUser(fixture.actorB.id);
});

describe("owner-only RLS второй схемы", () => {
    it("показывает слово словаря только владельцу", async () => {
        const { actorA, actorB, anon, vocabularyAId } = ctx();
        const mine = await actorA.client.from("vocabulary").select("id").eq("id", vocabularyAId);
        const foreign = await actorB.client.from("vocabulary").select("id").eq("id", vocabularyAId);
        const anonymous = await anon.from("vocabulary").select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("запрещает пользователю записывать и удалять свои слова", async () => {
        const { actorA, vocabularyAId } = ctx();
        const inserted = await actorA.client
            .from("vocabulary")
            .insert({ user_id: actorA.id, term: "Ephemeral" })
            .select("id");
        const deleted = await actorA.client.from("vocabulary").delete().eq("id", vocabularyAId).select("id");

        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(deleted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("не допускает дубль слова в другом регистре", async () => {
        const { admin, actorA } = ctx();
        const duplicated = await admin
            .from("vocabulary")
            .insert({ user_id: actorA.id, term: "serendipity" })
            .select("id");

        expect(duplicated.error?.code).toBe(UNIQUE_VIOLATION);
    }, 15_000);

    it("отклоняет слишком длинный термин", async () => {
        const { admin, actorA } = ctx();
        const tooLong = await admin
            .from("vocabulary")
            .insert({ user_id: actorA.id, term: "x".repeat(121) })
            .select("id");

        expect(tooLong.error?.code).toBe(CHECK_VIOLATION);
    }, 15_000);

    it("сохраняет слово после удаления урока", async () => {
        const { admin, vocabularyAId, lessonAId } = ctx();
        const removed = await admin.from("lessons").delete().eq("id", lessonAId).select("id");

        expect(removed.error).toBeNull();

        const word = await admin.from("vocabulary").select("id, source_lesson_id").eq("id", vocabularyAId).single();

        expect(word.error).toBeNull();
        expect(word.data?.source_lesson_id).toBeNull();
    }, 15_000);

    it("показывает замер уровня только владельцу и запрещает запись", async () => {
        const { actorA, actorB, anon } = ctx();
        const mine = await actorA.client.from("placement_results").select("id");
        const foreign = await actorB.client.from("placement_results").select("id");
        const anonymous = await anon.from("placement_results").select("id");
        const inserted = await actorA.client
            .from("placement_results")
            .insert({ user_id: actorA.id, level: "B1", score: 50 })
            .select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("проверяет ограничения уровня и балла", async () => {
        const { admin, actorA } = ctx();
        const badLevel = await admin
            .from("placement_results")
            .insert({ user_id: actorA.id, level: "Z9", score: 50 })
            .select("id");
        const badScore = await admin
            .from("placement_results")
            .insert({ user_id: actorA.id, level: "B1", score: 101 })
            .select("id");

        expect(badLevel.error?.code).toBe(CHECK_VIOLATION);
        expect(badScore.error?.code).toBe(CHECK_VIOLATION);
    }, 15_000);

    it("показывает тикет только владельцу и запрещает запись", async () => {
        const { actorA, actorB, anon, ticketAId } = ctx();
        const mine = await actorA.client.from("tickets").select("id").eq("id", ticketAId);
        const foreign = await actorB.client.from("tickets").select("id").eq("id", ticketAId);
        const anonymous = await anon.from("tickets").select("id");
        const inserted = await actorA.client.from("tickets").insert({ user_id: actorA.id, subject: "Свой тикет" }).select("id");
        const updated = await actorA.client.from("tickets").update({ status: "closed" }).eq("id", ticketAId).select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(1);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect(updated.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("показывает ответы поддержки владельцу тикета и запрещает писать напрямую", async () => {
        const { actorA, actorB, anon, ticketAId, ticketBId } = ctx();
        const mine = await actorA.client.from("ticket_messages").select("id").eq("ticket_id", ticketAId);
        const foreign = await actorB.client.from("ticket_messages").select("id").eq("ticket_id", ticketAId);
        const ownTicket = await actorB.client.from("ticket_messages").select("id").eq("ticket_id", ticketBId);
        const anonymous = await anon.from("ticket_messages").select("id");
        const inserted = await actorA.client
            .from("ticket_messages")
            .insert({ ticket_id: ticketAId, author: "user", content: "обход лимита" })
            .select("id");

        expect(mine.error).toBeNull();
        expect(mine.data).toHaveLength(2);
        expect(foreign.error).toBeNull();
        expect(foreign.data).toHaveLength(0);
        expect(ownTicket.error).toBeNull();
        expect(ownTicket.data).toHaveLength(1);
        expect(anonymous.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        // ARCHITECT: главный негатив: дописать ответ в свой же тикет нельзя — валидация и лимиты остаются на сервере.
        expect(inserted.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
    }, 15_000);

    it("уносит все данные пользователя при удалении аккаунта", async () => {
        const { admin, actorB, ticketBId } = ctx();
        const removed = await admin.auth.admin.deleteUser(actorB.id);

        expect(removed.error).toBeNull();

        const vocabulary = await admin.from("vocabulary").select("id").eq("user_id", actorB.id);
        const placement = await admin.from("placement_results").select("id").eq("user_id", actorB.id);
        const tickets = await admin.from("tickets").select("id").eq("user_id", actorB.id);
        const messages = await admin.from("ticket_messages").select("id").eq("ticket_id", ticketBId);

        expect(vocabulary.data).toHaveLength(0);
        expect(placement.data).toHaveLength(0);
        expect(tickets.data).toHaveLength(0);
        expect(messages.data).toHaveLength(0);
    }, 15_000);
});

