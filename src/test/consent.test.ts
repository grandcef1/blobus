// ARCHITECT: согласие на аналитику — гейт для всех сторонних сервисов, поэтому проверяется первым:
// ошибка здесь означает либо сбор данных без согласия, либо баннер, который показывается вечно.

import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_STORAGE_KEY, useConsentStore } from "@/store/consent";
import { resetStores } from "@/test/utils";

interface PersistedConsent {
    state: { analytics: boolean; decidedAt: number | null };
}

function readPersistedConsent(): PersistedConsent | null {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as PersistedConsent);
}

beforeEach(() => {
    resetStores();
});

describe("store согласия", () => {
    it("acceptAll включает аналитику и отмечает решение", () => {
        useConsentStore.getState().acceptAll();

        const { analytics, decidedAt } = useConsentStore.getState();
        expect(analytics).toBe(true);
        expect(decidedAt).toBeTypeOf("number");
    });

    it("acceptNecessary оставляет аналитику выключенной", () => {
        useConsentStore.getState().acceptNecessary();

        const { analytics, decidedAt } = useConsentStore.getState();
        expect(analytics).toBe(false);
        expect(decidedAt).not.toBeNull();
    });

    it("resetDecision снимает решение и гасит аналитику", () => {
        useConsentStore.getState().acceptAll();
        useConsentStore.getState().resetDecision();

        const { analytics, decidedAt } = useConsentStore.getState();
        expect(analytics).toBe(false);
        expect(decidedAt).toBeNull();
    });

    it("решение уезжает в localStorage под ключом blobus-consent", () => {
        expect(readPersistedConsent()).toBeNull();

        useConsentStore.getState().acceptAll();

        const persisted = readPersistedConsent();
        expect(persisted?.state.analytics).toBe(true);
        expect(persisted?.state.decidedAt).toBeTypeOf("number");
    });
});
