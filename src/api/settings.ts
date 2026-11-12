// ARCHITECT: настройки пока живут только в памяти страницы, но читаются через модуль-хранилище:
// скелетон — настоящее состояние загрузки, а с реальным бэкендом здесь меняется одна функция.
// Синхронный доступ не нужен: значений по умолчанию больше никто не держит.

import { delayMock } from "@/api/mockDelay";
import type { SettingsState } from "@/types/settings";

export const DEFAULT_SETTINGS: SettingsState = {
    notifications: {
        dailyReminder: true,
        weeklyProgress: true,
        newFeatures: false,
        marketingEmails: false,
    },
    preferences: {
        theme: "dark",
        soundEffects: true,
        language: "ru",
        autoCorrection: true,
    },
};

export async function fetchSettings(): Promise<SettingsState> {
    await delayMock();

    return DEFAULT_SETTINGS;
}