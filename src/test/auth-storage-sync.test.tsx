// ARCHITECT: без межвкладочной синхронизации выход в одной вкладке оставлял другую «залогиненной»,
// а отзыв согласия не гасил аналитику в соседних. Тест подаёт storage-событие — ровно то, что браузер
// присылает остальным вкладкам, — и проверяет локальные сторы.

import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { AuthUser } from "@/api/auth";
import { useAuthStorageSync } from "@/hooks/useAuthStorageSync";
import { AUTH_STORAGE_KEY, useAuthStore } from "@/store/auth";
import { CONSENT_STORAGE_KEY, useConsentStore } from "@/store/consent";
import { resetStores, renderWithProviders } from "@/test/utils";

const USER: AuthUser = {
    id: "user_1",
    name: "Ученик",
    email: "student@blobus.ai",
    role: "user",
    emailVerified: true,
};

function SyncProbe() {
    useAuthStorageSync();

    return null;
}

// ARCHITECT: событие приходит в другие вкладки только после записи в localStorage, поэтому тест
// повторяет оба шага браузера: сохранить payload и разослать событие.
async function emitStorage(key: string, value: string): Promise<void> {
    await act(async () => {
        window.localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
    });
}

describe("useAuthStorageSync", () => {
    beforeEach(() => {
        resetStores();
    });

    it("выход в другой вкладке обнуляет локального пользователя", async () => {
        useAuthStore.setState({ user: USER });
        renderWithProviders(<SyncProbe />);

        await emitStorage(AUTH_STORAGE_KEY, JSON.stringify({ state: { user: null }, version: 0 }));

        await waitFor(() => {
            expect(useAuthStore.getState().user).toBeNull();
        });
    });

    it("вход в другой вкладке поднимает пользователя", async () => {
        renderWithProviders(<SyncProbe />);

        await emitStorage(AUTH_STORAGE_KEY, JSON.stringify({ state: { user: USER }, version: 0 }));

        await waitFor(() => {
            expect(useAuthStore.getState().user?.id).toBe("user_1");
        });
    });

    it("отзыв согласия в другой вкладке гасит аналитику", async () => {
        useConsentStore.setState({ analytics: true, decidedAt: 1 });
        renderWithProviders(<SyncProbe />);

        await emitStorage(
            CONSENT_STORAGE_KEY,
            JSON.stringify({ state: { analytics: false, decidedAt: null }, version: 0 })
        );

        await waitFor(() => {
            expect(useConsentStore.getState().analytics).toBe(false);
        });
    });
});
