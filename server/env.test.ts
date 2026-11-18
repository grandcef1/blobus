// ARCHITECT: тесты серверного env живут в том же прогоне, что и фронтенд, и не переключают окружение:
// общий setup-файл (src/test/setup.ts) трогает window, а нужные здесь Node-API в jsdom доступны,
// поэтому отдельная настройка environment для этого файла не нужна.
import { describe, expect, it } from "vitest";

import { ServerEnvSchema, loadEnv } from "./env.ts";

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
    it("возвращает значения по умолчанию для пустого источника", () => {
        const env = loadEnv({});

        expect(env.NODE_ENV).toBe("development");
        expect(env.PORT).toBe(8787);
    });

    it("приводит PORT к числу и принимает production", () => {
        const env = loadEnv({ NODE_ENV: "production", PORT: "3000" });

        expect(env.NODE_ENV).toBe("production");
        expect(env.PORT).toBe(3000);
    });

    it("бросает на нечисловой PORT и не выводит его значение", () => {
        const message = loadEnvError({ PORT: "abc" });

        expect(message).toContain("PORT");
        expect(message).not.toContain("abc");
    });

    it("бросает на PORT вне диапазона 1..65535", () => {
        for (const port of ["0", "70000"]) {
            expect(loadEnvError({ PORT: port })).toContain("PORT");
        }
    });

    it("бросает на неподдерживаемый NODE_ENV и не выводит его значение", () => {
        const message = loadEnvError({ NODE_ENV: "staging" });

        expect(message).toContain("NODE_ENV");
        expect(message).not.toContain("staging");
    });

    it("отбрасывает неизвестные ключи: VITE_* и секреты не входят в server-env", () => {
        const env = loadEnv({ VITE_SECRET: "sentinel-value", OPENROUTER_API_KEY: "sk-sentinel" });

        expect(Object.keys(env)).toEqual(["NODE_ENV", "PORT"]);
        expect(Object.keys(ServerEnvSchema.shape)).toEqual(["NODE_ENV", "PORT"]);
        expect(env).not.toHaveProperty("VITE_SECRET");
        expect(env).not.toHaveProperty("OPENROUTER_API_KEY");
    });

    it("не включает значение-сентинел в текст ошибки", () => {
        const message = loadEnvError({ PORT: "sk-sentinel-port" });

        expect(message).toContain("PORT");
        expect(message).not.toContain("sk-sentinel-port");
    });
});
