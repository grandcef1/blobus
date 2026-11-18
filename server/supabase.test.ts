// ARCHITECT: тесты идут против локального стека Supabase, который поднимает владелец (npx supabase start).
// Окружение не переключаем на node: общий setup-файл (src/test/setup.ts) трогает window, а нужные здесь
// Node-API (execFileSync, fetch) в jsdom доступны.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

interface LocalStack {
    readonly url: string;
    readonly publishableKey: string;
    readonly secretKey: string;
}

/** Ответ `supabase status -o json`: новые ключи publishable/secret, legacy anon/service_role как запасной путь. */
interface StackStatus {
    readonly API_URL?: string;
    readonly PUBLISHABLE_KEY?: string;
    readonly ANON_KEY?: string;
    readonly SECRET_KEY?: string;
    readonly SERVICE_ROLE_KEY?: string;
}

const STACK_HINT = "local Supabase stack is not running: run npx supabase start";

let stack: LocalStack | undefined;

function readStack(): LocalStack {
    let raw: string;

    try {
        raw = execFileSync("npx", ["supabase", "status", "-o", "json"], {
            shell: true,
            encoding: "utf8",
        });
    } catch {
        throw new Error(STACK_HINT);
    }

    const status = JSON.parse(raw) as StackStatus;
    // ARCHITECT: новые ключи publishable/secret предпочитаются legacy anon/service_role: legacy устаревают к концу 2026.
    const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
    const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

    if (status.API_URL === undefined || publishableKey === undefined || secretKey === undefined) {
        throw new Error(STACK_HINT);
    }

    // ARCHITECT: локальные demo-ключи не секреты, но источник у них один — status, поэтому в коде их нет.
    return { url: status.API_URL, publishableKey, secretKey };
}

function localStack(): LocalStack {
    if (stack === undefined) throw new Error(STACK_HINT);

    return stack;
}

/** Клиент с выключенной сессией: тесты не пишут в localStorage и не держат таймеров обновления токена. */
function makeClient(key: string) {
    const { url } = localStack();

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// ARCHITECT: тесты требуют запущенного локального стека и падают громко, а не молча пропускаются: пропуск
// скрыл бы поломку окружения, а смоук нужен именно как проверка живой базы.
beforeAll(() => {
    stack = readStack();
}, 30_000);

describe("локальный стек Supabase", () => {
    it("отвечает 200 на /auth/v1/health с publishable-ключом", async () => {
        const { url, publishableKey } = localStack();
        const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishableKey } });

        expect(response.status).toBe(200);
    }, 15_000);

    it("отвечает 200 на /rest/v1/ с publishable-ключом", async () => {
        const { url, publishableKey } = localStack();
        const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: publishableKey } });

        expect(response.status).toBe(200);
    }, 15_000);

    it("не находит сессию у publishable-клиента без входа", async () => {
        const { publishableKey } = localStack();
        const { data, error } = await makeClient(publishableKey).auth.getSession();

        expect(error).toBeNull();
        expect(data.session).toBeNull();
    }, 15_000);

    it("отдаёт список пользователей secret-клиенту", async () => {
        // ARCHITECT: secret-клиент только для серверных тестов: он обходит RLS и в браузер не попадает.
        const { secretKey } = localStack();
        const { data, error } = await makeClient(secretKey).auth.admin.listUsers();

        expect(error).toBeNull();
        expect(Array.isArray(data.users)).toBe(true);
    }, 15_000);

    it("отклоняет недействительный ключ на /rest/v1/", async () => {
        const { url } = localStack();
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
