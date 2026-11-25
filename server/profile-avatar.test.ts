// ARCHITECT: миграция аватара проверяется на реальном стеке Supabase: колонка, гранты и приватный бакет —
// это схема, а не маршрут, поэтому HTTP-приложение здесь не поднимается. Негативы обязательны: authenticated
// не пишет avatar_path и не грузит объекты в avatars; service_role пишет и выдаёт signed URL.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAdminClient, createAnonClient, createUserClient } from "./test-stack.ts";

const EMAIL_PREFIX = `avatar-${randomUUID()}`;
const PASSWORD = `Avatar-${randomUUID()}-1`;
/** Код Postgres «недостаточно прав»: колоночный grant update не включает avatar_path. */
const INSUFFICIENT_PRIVILEGE = "42501";
const BUCKET = "avatars";
const FILE_SIZE_LIMIT = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Тестовое содержимое: storage не разбирает картинки, mime-тип задаётся явно. */
const TEST_OBJECT = "avatar-test-object";

let userId: string | undefined;
let userEmail: string | undefined;

/** Пользователь прогона: свежий аккаунт получает строку профиля от триггера handle_new_user. */
function ctxUser(): { readonly id: string; readonly email: string } {
    if (userId === undefined || userEmail === undefined)
        throw new Error("тестовый пользователь не создан");

    return { id: userId, email: userEmail };
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

/** Access-токен пользователя прямо из GoTrue: нужен клиент под RLS для проверок грантов. */
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

/** Строка профиля сервисным клиентом: источник правды для проверок «значение не изменилось» (§16.5). */
async function profileRow(
    id: string
): Promise<{ readonly avatarPath: string | null; readonly displayName: string }> {
    const { data, error } = await createAdminClient()
        .from("profiles")
        .select("avatar_path, display_name")
        .eq("id", id)
        .single();

    if (error !== null) throw error;

    return { avatarPath: data.avatar_path, displayName: data.display_name };
}

beforeAll(async () => {
    const email = `${EMAIL_PREFIX}-user@example.test`;

    userId = await createConfirmedUser(email);
    userEmail = email;
}, 30_000);

// ARCHITECT: уборка не должна прятать результат тестов: аккаунты прогона удаляются по префиксу, тестовые
// объекты бакета — по ключам, ошибки гасятся.
afterAll(async () => {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const stale = (data?.users ?? []).filter((user) => (user.email ?? "").startsWith(EMAIL_PREFIX));

    for (const user of stale) {
        await admin.auth.admin.deleteUser(user.id).catch(() => undefined);
    }

    if (userId !== undefined) {
        await admin.storage
            .from(BUCKET)
            .remove([`${userId}/anonymous.png`, `${userId}/service.png`])
            .catch(() => undefined);
    }
}, 30_000);
describe("схема аватара profiles и бакет avatars", () => {
    it("4.1 свежий профиль: колонка avatar_path есть и равна null", async () => {
        const row = await profileRow(ctxUser().id);

        expect(row.avatarPath).toBeNull();
    }, 30_000);

    it("4.2 authenticated не пишет avatar_path: 42501, значение в БД не изменилось", async () => {
        const token = await accessTokenFor(ctxUser().email);
        const user = createUserClient(token);

        const updated = await user
            .from("profiles")
            .update({ avatar_path: `${ctxUser().id}/anonymous.png` })
            .eq("id", ctxUser().id)
            .select("avatar_path");

        expect(updated.error?.code).toBe(INSUFFICIENT_PRIVILEGE);
        expect((await profileRow(ctxUser().id)).avatarPath).toBeNull();
    }, 30_000);

    it("4.3 колоночный grant не сломан: authenticated правит display_name своей строки", async () => {
        const token = await accessTokenFor(ctxUser().email);
        const user = createUserClient(token);

        const updated = await user
            .from("profiles")
            .update({ display_name: "Аватар Тест" })
            .eq("id", ctxUser().id)
            .select("display_name");

        expect(updated.error).toBeNull();
        expect((await profileRow(ctxUser().id)).displayName).toBe("Аватар Тест");
    }, 30_000);

    it("4.4 бакет avatars существует, приватный, с лимитом 2 МБ и тремя mime-типами", async () => {
        const { data, error } = await createAdminClient().storage.listBuckets();

        expect(error).toBeNull();

        const bucket = (data ?? []).find((item) => item.id === BUCKET);

        expect(bucket).toBeDefined();
        expect(bucket?.public).toBe(false);
        expect(bucket?.file_size_limit).toBe(FILE_SIZE_LIMIT);
        expect([...(bucket?.allowed_mime_types ?? [])].sort()).toEqual(
            [...ALLOWED_MIME_TYPES].sort()
        );
    }, 30_000);

    it("4.5 authenticated не грузит в avatars и не видит содержимое бакета", async () => {
        const token = await accessTokenFor(ctxUser().email);
        const user = createUserClient(token);
        const uploaded = await user.storage
            .from(BUCKET)
            .upload(`${ctxUser().id}/anonymous.png`, TEST_OBJECT, { contentType: "image/png" });
        const listed = await user.storage.from(BUCKET).list();

        expect(uploaded.error).not.toBeNull();
        expect(listed.error !== null || (listed.data ?? []).length === 0).toBe(true);
    }, 30_000);

    it("4.6 service_role грузит объект, получает signed URL и удаляет его", async () => {
        const admin = createAdminClient();
        const path = `${ctxUser().id}/service.png`;
        const uploaded = await admin.storage.from(BUCKET).upload(path, TEST_OBJECT, {
            contentType: "image/png",
            upsert: true,
        });

        expect(uploaded.error).toBeNull();

        const signed = await admin.storage.from(BUCKET).createSignedUrl(path, 60);

        expect(signed.error).toBeNull();
        expect(typeof signed.data?.signedUrl).toBe("string");
        expect(signed.data?.signedUrl).toContain(path);

        const removed = await admin.storage.from(BUCKET).remove([path]);

        expect(removed.error).toBeNull();
    }, 30_000);
});
