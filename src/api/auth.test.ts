// ARCHITECT: Google-вход ломался на проде из-за одной опции: при persistSession:false auth-js держит PKCE
// code-verifier в хранилище памяти страницы (memoryLocalStorageAdapter), а страница уходит к провайдеру —
// verifier теряется, exchangeCodeForSession на /login?code=... не находит его, и серверная сессия не
// создаётся. Тест сторожит ровно этот флаг: BROWSER_AUTH_OPTIONS читается как данные — без моков
// supabase-js и без подмены import.meta.env.

import { describe, expect, it } from "vitest";
import { BROWSER_AUTH_OPTIONS } from "@/api/auth";

describe("настройки браузерного supabase-клиента", () => {
    it("хранит сессию, чтобы code-verifier пережил редирект к провайдеру", () => {
        expect(BROWSER_AUTH_OPTIONS.persistSession).toBe(true);
    });

    it("не возвращается к потере verifier: persistSession не false", () => {
        expect(BROWSER_AUTH_OPTIONS.persistSession).not.toBe(false);
    });

    it("остаётся на PKCE-танце", () => {
        expect(BROWSER_AUTH_OPTIONS.flowType).toBe("pkce");
    });

    it("не подхватывает сессию из адреса", () => {
        expect(BROWSER_AUTH_OPTIONS.detectSessionInUrl).toBe(false);
    });

    it("не обновляет токен в фоне: источник правды — серверная кука", () => {
        expect(BROWSER_AUTH_OPTIONS.autoRefreshToken).toBe(false);
    });
});
