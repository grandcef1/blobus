// ARCHITECT: конфиг тестов отделён от vite.config.ts: прод-сборка не должна знать про vitest, а
// test-поля в прод-конфиге читались бы как её часть. Плагин react нужен и здесь — тесты содержат JSX,
// и компилирует его тот же плагин, что и приложение.
// ARCHITECT: globals: false — describe/it/expect импортируются явно: тест остаётся обычным модулем, а
// его падение не зависит от настроек линтера.

import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Тот же алиас, что в vite.config.ts: импорты в тестах пишутся как в коде приложения.
        // ARCHITECT: import.meta.dirname вместо __dirname — конфиг исполняется как ESM.
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./src/test/setup.ts"],
    },
});
