// ARCHITECT: тесты идут против локального стека Supabase, который поднимает владелец (npx supabase start).
// Окружение не переключаем на node: общий setup-файл (src/test/setup.ts) трогает window, а нужный здесь
// fetch в jsdom доступен. Адрес и ключи приходят из ./test-stack.ts — источник один, `supabase status`.
import { beforeAll, describe, expect, it } from "vitest";

import { createAdminClient, createAnonClient, readLocalStack } from "./test-stack.ts";

// ARCHITECT: тесты требуют запущенного локального стека и падают громко, а не молча пропускаются: пропуск
// скрыл бы поломку окружения, а смоук нужен именно как проверка живой базы.
beforeAll(() => {
    readLocalStack();
}, 30_000);

describe("локальный стек Supabase", () => {
    it("отвечает 200 на /auth/v1/health с publishable-ключом", async () => {
        const { url, publishableKey } = readLocalStack();
        const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishableKey } });

        expect(response.status).toBe(200);
    }, 15_000);

    it("отвечает 200 на /rest/v1/ с publishable-ключом", async () => {
        const { url, publishableKey } = readLocalStack();
        const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: publishableKey } });

        expect(response.status).toBe(200);
    }, 15_000);

    it("не находит сессию у publishable-клиента без входа", async () => {
        const { data, error } = await createAnonClient().auth.getSession();

        expect(error).toBeNull();
        expect(data.session).toBeNull();
    }, 15_000);

    it("отдаёт список пользователей secret-клиенту", async () => {
        // ARCHITECT: secret-клиент только для серверных тестов: он обходит RLS и в браузер не попадает.
        const { data, error } = await createAdminClient().auth.admin.listUsers();

        expect(error).toBeNull();
        expect(Array.isArray(data.users)).toBe(true);
    }, 15_000);

    it("отклоняет недействительный ключ на /rest/v1/", async () => {
        const { url } = readLocalStack();
        // ARCHITECT: Kong локального стека не проверяет apikey на корне /rest/v1/ (200 при любом значении),
        // поэтому недействительный ключ отправляется ещё и как bearer: только так запрос реально отвергается (401).
        const response = await fetch(`${url}/rest/v1/`, {
            headers: {
                apikey: "invalid-key-sentinel",
                authorization: "Bearer invalid-key-sentinel",
            },
        });

        expect(response.status).toBe(401);
    }, 15_000);
});
