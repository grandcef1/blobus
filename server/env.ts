// ARCHITECT: единственная точка чтения серверных переменных окружения. Модуль не обращается к
// process.env сам и ничего не выполняет при импорте: источник передаёт вызывающий (в Ф1.2 — server/index.ts),
// поэтому отсутствие переменной останавливает старт процесса, а не ломает импорт в тестах.
import { z } from "zod";

// ARCHITECT: схема отбрасывает неизвестные ключи, поэтому VITE_* и любые секреты (Supabase service-role,
// OpenRouter) не входят в типизированный server-env, пока схема не объявит их явно: фронтенд-переменную
// нельзя случайно прочитать как серверную.
// ARCHITECT: сейчас схема минимальна (NODE_ENV, PORT). Ключи Supabase и OpenRouter добавляются
// обязательными в своих фазах, чтобы отсутствие секрета останавливало старт (fail-fast), а не
// проявлялось позже пустым ответом.
export const ServerEnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
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
