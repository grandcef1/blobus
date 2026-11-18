// ARCHITECT: общий хелпер серверных тестов: единственный источник локальных ключей — `supabase status`,
// в коде ключи не хардкодятся, потому что значения меняются вместе со стеком.
// ARCHITECT: тесты требуют запущенного локального стека и падают громко, а не пропускаются молча.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface LocalStack {
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

/**
 * Минимальная схема для типов supabase-js: без неё insert/update получают тип `never`.
 * Полный сгенерированный тип появится вместе с клиентскими запросами; здесь достаточно имён таблиц.
 */
interface Database {
    public: {
        Tables: {
            profiles: SchemaTable;
            sessions: SchemaTable;
            lessons: SchemaTable;
            messages: SchemaTable;
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
    };
}

type SchemaRow = Record<string, unknown>;

interface SchemaTable {
    Row: SchemaRow;
    Insert: SchemaRow;
    Update: SchemaRow;
    Relationships: [];
}

export type StackClient = SupabaseClient<Database>;

const STACK_HINT = "local Supabase stack is not running: run npx supabase start";

let cached: LocalStack | undefined;

/** Читает адрес и ключи локального стека один раз за прогон: status — единственный источник этих значений. */
export function readLocalStack(): LocalStack {
    if (cached !== undefined) return cached;

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

    cached = { url: status.API_URL, publishableKey, secretKey };

    return cached;
}

// ARCHITECT: secret-клиент только для серверных тестов: он обходит RLS и в браузер не попадает.
export function createAdminClient(): StackClient {
    const { url, secretKey } = readLocalStack();

    return createClient<Database>(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/** Анонимный клиент: publishable-ключ без сессии — то, что видит неавторизованный посетитель. */
export function createAnonClient(): StackClient {
    const { url, publishableKey } = readLocalStack();

    return createClient<Database>(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/** Клиент от имени пользователя: тот же publishable-ключ, токен уходит заголовком Authorization. */
export function createUserClient(accessToken: string): StackClient {
    const { url, publishableKey } = readLocalStack();

    return createClient<Database>(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}
