// ARCHITECT: CSP отдаёт Vercel из vercel.json, а не dev-сервер, поэтому поломка видна только на проде:
// connect-src без origin Supabase блокирует fetch на /auth/v1/token?grant_type=pkce ещё до сети (status 0),
// и Google-вход не создаёт сессию. Тест сторожит allowlist: добавленный origin на месте, чужие токены не
// потеряны, wildcard не появился.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface HeaderEntry {
    readonly key: string;
    readonly value: string;
}

interface VercelConfig {
    readonly headers: readonly { readonly headers: readonly HeaderEntry[] }[];
}

/** Значение политики Content-Security-Policy из заголовков vercel.json. */
function cspPolicy(config: VercelConfig): string {
    const header = config.headers
        .flatMap((rule) => rule.headers)
        .find((entry) => entry.key === "Content-Security-Policy");

    if (header === undefined) throw new Error("vercel.json: Content-Security-Policy не найден");

    return header.value;
}

/** Токены директивы CSP: по ним проверяется allowlist (первый токен — имя директивы). */
function directiveTokens(policy: string, name: string): string[] {
    const directive = policy
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.split(/\s+/)[0] === name);

    if (directive === undefined) throw new Error(`CSP: директива ${name} не найдена`);

    return directive.split(/\s+/).slice(1);
}

const POLICY = cspPolicy(
    JSON.parse(
        readFileSync(path.resolve(import.meta.dirname, "vercel.json"), "utf8")
    ) as VercelConfig
);

describe("CSP в vercel.json", () => {
    it("разрешает браузерный PKCE-обмен с origin Supabase", () => {
        expect(directiveTokens(POLICY, "connect-src")).toContain(
            "https://mfjzaquyulepqsmkvcxl.supabase.co"
        );
    });

    it("сохраняет прежние origin'ы аналитики", () => {
        expect(directiveTokens(POLICY, "connect-src")).toContain(
            "https://vitals.vercel-insights.com"
        );
    });

    it("остаётся allowlist'ом без wildcard", () => {
        expect(directiveTokens(POLICY, "connect-src")).not.toContain("*");
        expect(directiveTokens(POLICY, "connect-src")).not.toContain("https://*.supabase.co");
    });

    it("держит default-src равным 'self'", () => {
        expect(directiveTokens(POLICY, "default-src")).toEqual(["'self'"]);
    });
});
