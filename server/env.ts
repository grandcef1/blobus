// ARCHITECT: единственная точка чтения серверных переменных окружения. Модуль не обращается к
// process.env сам и ничего не выполняет при импорте: источник передаёт вызывающий (в Ф1.2 — server/index.ts),
// поэтому отсутствие переменной останавливает старт процесса, а не ломает импорт в тестах.
import { z } from "zod";

// ARCHITECT: схема отбрасывает неизвестные ключи, поэтому VITE_* и любые секреты (Supabase service-role,
// OpenRouter) не входят в типизированный server-env, пока схема не объявит их явно: фронтенд-переменную
// нельзя случайно прочитать как серверную.
// ARCHITECT: ключи Supabase только серверные и никогда не VITE_; используем новые sb_publishable и
// sb_secret, потому что legacy anon/service_role устаревают к концу 2026. Локальные значения берутся из
// npx supabase status. Обязательные поля останавливают старт при отсутствии (fail-fast), а не проявляются
// позже пустым ответом.
export const ServerEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    SUPABASE_URL: z.string().url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
    SUPABASE_SECRET_KEY: z.string().startsWith("sb_secret_"),
    // ARCHITECT: ключ OpenRouter только серверный и обязательный: без него чат не работает, поэтому
    // отсутствие ключа останавливает старт (fail-fast), а не проявляется 500 на первом сообщении (§16.3).
    OPENROUTER_API_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/**
 * Проверяет переданный источник переменных и возвращает типизированный server-env.
 * Непрошедший ключ останавливает старт: конфигурация проверяется до поднятия сервера.
 */
export function loadEnv(source: Readonly<Record<string, string | undefined>>): ServerEnv {
    const result = ServerEnvSchema.safeParse(source);

    if (!result.success) {
        // ARCHITECT: в текст ошибки идут только имена ключей: значения PORT и будущих секретов не должны
        // попадать ни в терминал, ни в логи — в проде отчёты об ошибках уходят на серверный endpoint.
        const keys = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
        throw new Error(`Invalid server env: ${keys.join(", ")}`);
    }

    return result.data;
}
