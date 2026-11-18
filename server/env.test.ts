// ARCHITECT: тесты серверного env живут в том же прогоне, что и фронтенд, и не переключают окружение:
// общий setup-файл (src/test/setup.ts) трогает window, а нужные здесь Node-API в jsdom доступны,
// поэтому отдельная настройка environment для этого файла не нужна.
import { describe, expect, it } from "vitest";

import { ServerEnvSchema, loadEnv } from "./env.ts";

/** Валидный источник для тестов: локальные значения Supabase, реальное окружение не читается. */
const VALID_SOURCE = {
    NODE_ENV: "test",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    SUPABASE_SECRET_KEY: "sb_secret_test",
} as const;

/** Возвращает текст ошибки loadEnv или падает, если ошибки не было: негативные проверки обязательны. */
function loadEnvError(source: Record<string, string>): string {
    try {
        loadEnv(source);
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }

    throw new Error("loadEnv должен был бросить ошибку");
}

describe("loadEnv", () => {
    it("парсит валидный источник и сохраняет дефолты", () => {
        const env = loadEnv(VALID_SOURCE);

        expect(env.NODE_ENV).toBe("test");
        expect(env.PORT).toBe(8787);
        expect(env.SUPABASE_URL).toBe(VALID_SOURCE.SUPABASE_URL);
        expect(env.SUPABASE_PUBLISHABLE_KEY).toBe(VALID_SOURCE.SUPABASE_PUBLISHABLE_KEY);
        expect(env.SUPABASE_SECRET_KEY).toBe(VALID_SOURCE.SUPABASE_SECRET_KEY);
    });

    it("бросает, если отсутствует любой ключ Supabase, и называет его", () => {
        for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"] as const) {
            const source: Record<string, string> = { ...VALID_SOURCE };
            delete source[key];

            expect(loadEnvError(source)).toContain(key);
        }
    });

    it("бросает на неверный префикс ключа и не выводит значение", () => {
        const message = loadEnvError({ ...VALID_SOURCE, SUPABASE_PUBLISHABLE_KEY: "sb_secret_x" });

        expect(message).toContain("SUPABASE_PUBLISHABLE_KEY");
        expect(message).not.toContain("sb_secret_x");
    });

    it("приводит PORT к числу и принимает production", () => {
        const env = loadEnv({ ...VALID_SOURCE, NODE_ENV: "production", PORT: "3000" });

        expect(env.NODE_ENV).toBe("production");
        expect(env.PORT).toBe(3000);
    });

    it("бросает на нечисловой PORT и не выводит его значение", () => {
        const message = loadEnvError({ ...VALID_SOURCE, PORT: "abc" });

        expect(message).toContain("PORT");
        expect(message).not.toContain("abc");
    });

    it("бросает на PORT вне диапазона 1..65535", () => {
        for (const port of ["0", "70000"]) {
            expect(loadEnvError({ ...VALID_SOURCE, PORT: port })).toContain("PORT");
        }
    });

    it("бросает на неподдерживаемый NODE_ENV и не выводит его значение", () => {
        const message = loadEnvError({ ...VALID_SOURCE, NODE_ENV: "staging" });

        expect(message).toContain("NODE_ENV");
        expect(message).not.toContain("staging");
    });

    it("отбрасывает неизвестные ключи: VITE_* и посторонние секреты не входят в server-env", () => {
        const env = loadEnv({ ...VALID_SOURCE, VITE_SECRET: "sentinel-value", OPENROUTER_API_KEY: "sk-sentinel" });

        expect(Object.keys(env)).toEqual([
            "NODE_ENV",
            "PORT",
            "SUPABASE_URL",
            "SUPABASE_PUBLISHABLE_KEY",
            "SUPABASE_SECRET_KEY",
        ]);
        expect(Object.keys(ServerEnvSchema.shape)).toEqual([
            "NODE_ENV",
            "PORT",
            "SUPABASE_URL",
            "SUPABASE_PUBLISHABLE_KEY",
            "SUPABASE_SECRET_KEY",
        ]);
        expect(env).not.toHaveProperty("VITE_SECRET");
        expect(env).not.toHaveProperty("OPENROUTER_API_KEY");
    });

    it("не включает значение-сентинел в текст ошибки для SUPABASE_URL", () => {
        const message = loadEnvError({ ...VALID_SOURCE, SUPABASE_URL: "sentinel-url-value" });

        expect(message).toContain("SUPABASE_URL");
        expect(message).not.toContain("sentinel-url-value");
    });

    it("не включает сентинел из PORT в текст ошибки", () => {
        const message = loadEnvError({ ...VALID_SOURCE, PORT: "sk-sentinel-port" });

        expect(message).toContain("PORT");
        expect(message).not.toContain("sk-sentinel-port");
    });
});
