import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // ARCHITECT: прокси только для dev-браузера (5173 → 8787): в проде запросы идут на тот же origin.
    // changeOrigin: false сохраняет Host: localhost, поэтому hostname из Origin и req.hostname совпадают и
    // CSRF-проверка (server/csrf.ts) проходит; куки в dev ставятся без Secure и живут на localhost.
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8787",
                changeOrigin: false,
            },
        },
    },
});
