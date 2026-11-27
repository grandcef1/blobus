// ARCHITECT: чистые unit-тесты хелпера: он не зависит от React, поэтому переводчик передаётся заглушкой
// (key) => key, и проверяется именно маппинг ключей, а не наличие словаря.

import { describe, expect, it } from "vitest";

import { getSessionTitle } from "@/lib/sessionTitle";
import type { SessionSummaryDto } from "@/api/sessions";

const translator = (key: string): string => key;

function summary(overrides: Partial<SessionSummaryDto> = {}): SessionSummaryDto {
    return {
        id: overrides.id ?? "a1b2c3d4-0001-4000-8000-000000000001",
        title: overrides.title ?? null,
        tutorId: overrides.tutorId ?? "miya",
        mode: overrides.mode ?? "speaking",
        createdAt: overrides.createdAt ?? "2026-11-18T09:00:00.000Z",
        updatedAt: overrides.updatedAt ?? "2026-11-18T09:30:00.000Z",
    };
}

describe("getSessionTitle", () => {
    it("3.1 известный режим и блобатар: имя и ключ режима через разделитель", () => {
        const title = getSessionTitle(summary(), translator);

        expect(title).toContain("Мия");
        expect(title).toContain("modes.speaking");
        expect(title).toBe("Мия · modes.speaking");
    });

    it("3.2 неизвестный режим показывается как данные, без ключа modes.*", () => {
        const title = getSessionTitle(summary({ mode: "listening" }), translator);

        expect(title).toBe("Мия · listening");
        expect(title).not.toContain("modes.");
    });

    it("3.3 неизвестный tutorId даёт ключ-заглушку вместо имени", () => {
        const title = getSessionTitle(summary({ tutorId: "unknown-tutor" }), translator);

        expect(title).toBe("sessions.card.tutorFallback · modes.speaking");
    });

    it("3.4 все четыре известных режима маппятся в свои ключи", () => {
        const cases: readonly (readonly [string, string])[] = [
            ["interview", "modes.interview"],
            ["speaking", "modes.speaking"],
            ["grammar", "modes.grammar"],
            ["general", "modes.general"],
        ];

        for (const [mode, key] of cases) {
            expect(getSessionTitle(summary({ mode }), translator)).toBe(`Мия · ${key}`);
        }
    });

    it("3.5 своё название сессии важнее производного заголовка", () => {
        const title = getSessionTitle(summary({ title: "Подготовка к собеседованию" }), translator);

        expect(title).toBe("Подготовка к собеседованию");
        expect(title).not.toContain("modes.");
    });

    it("3.6 название из пробелов считается пустым: показывается производный заголовок", () => {
        const title = getSessionTitle(summary({ title: "   " }), translator);

        expect(title).toBe("Мия · modes.speaking");
    });

    it("3.7 отсутствующее название (старый API) не роняет заголовок, а даёт производный", () => {
        const legacy = { ...summary(), title: undefined } as unknown as SessionSummaryDto;

        expect(getSessionTitle(legacy, translator)).toBe("Мия · modes.speaking");
    });
});
