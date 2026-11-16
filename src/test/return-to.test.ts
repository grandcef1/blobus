// ARCHITECT: open redirect — security-граница: guard вынесен из Login.tsx в чистую функцию, поэтому
// правило «пускать только /app/*» проверяется без рендера компонента.

import { describe, expect, it } from "vitest";
import { resolveReturnTo } from "@/lib/return-to";

describe("resolveReturnTo", () => {
    it("возвращает внутренний путь приложения", () => {
        expect(resolveReturnTo({ from: "/app/settings" })).toBe("/app/settings");
    });

    it("отклоняет протокол-относительный адрес", () => {
        expect(resolveReturnTo({ from: "//evil.com" })).toBeNull();
    });

    it("отклоняет внешний URL", () => {
        expect(resolveReturnTo({ from: "https://evil.com" })).toBeNull();
    });

    it("отклоняет путь за пределами /app/*", () => {
        expect(resolveReturnTo({ from: "/login" })).toBeNull();
    });

    it("отклоняет всё, что не объект с полем from", () => {
        expect(resolveReturnTo(null)).toBeNull();
        expect(resolveReturnTo(undefined)).toBeNull();
        expect(resolveReturnTo("/app/settings")).toBeNull();
        expect(resolveReturnTo({ from: 42 })).toBeNull();
    });
});
