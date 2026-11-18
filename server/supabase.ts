// ARCHITECT: фабрики на вызов, а не синглтоны: сервер не держит глобального состояния, а каждый
// пользовательский запрос получает свой клиент с чужим токеном.
// ARCHITECT: никакого клиентского состояния сессий — persistSession и autoRefreshToken выключены:
// на сервере нет localStorage, а обновление токена делает вызывающий код, не клиент.
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types.ts";

/** Минимальный набор значений окружения: совместим с ServerEnv, но не требует NODE_ENV и PORT. */
export interface SupabaseEnv {
    readonly SUPABASE_URL: string;
    readonly SUPABASE_PUBLISHABLE_KEY: string;
    readonly SUPABASE_SECRET_KEY: string;
}

export type SupabaseServerClient = SupabaseClient<Database>;

// ARCHITECT: сервисный клиент обходит RLS и живёт только на сервере — для квот и админ-операций;
// пользовательский клиент создаётся на запрос и попадает под RLS.
export function createServiceClient(env: SupabaseEnv): SupabaseServerClient {
    return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export function createUserClient(env: SupabaseEnv, accessToken: string): SupabaseServerClient {
    return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}
