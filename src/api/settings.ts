// ARCHITECT: настройки через модуль-адаптер: гейт USE_MOCKS как в api/profile.ts — мок-ветка отдаёт дефолты,
// real-ветка ходит в /api/settings (cookie-сессия и CSRF внутри apiFetch). Форма ответа одинакова в обеих
// ветках, наружу уходит только SettingsState.

import { apiFetch } from "@/api/client";
import { delayMock } from "@/api/mockDelay";
import { USE_MOCKS } from "@/lib/env";
import { DEFAULT_LANGUAGE } from "@/lib/i18n";
import type { SettingsState } from "@/types/settings";

/** Настройки, которые рендерит страница: сервер отдаёт ровно эти четыре ключа. */
export type SettingsPreferences = SettingsState["preferences"];
/** Патч настроек: сервер сливает присланные ключи с сохранёнными, поэтому поле можно менять по одному. */
export type SettingsPatch = Partial<SettingsPreferences>;

export const DEFAULT_SETTINGS: SettingsState = {
    preferences: {
        soundEffects: true,
        autoCorrection: true,
        explanationLocale: DEFAULT_LANGUAGE,
        voiceEnabled: false,
    },
    plan: "free",
};

/** Конверт ответа GET/PATCH /api/settings (server/routes/settings.ts): тариф идёт рядом с настройками. */
interface SettingsEnvelope {
    settings: SettingsPreferences;
    plan: SettingsState["plan"];
}

// ARCHITECT: маппер один на чтение и запись: форма серверного конверта не покидает модуль (§16.13).
function toSettingsState(envelope: SettingsEnvelope): SettingsState {
    return {
        preferences: {
            soundEffects: envelope.settings.soundEffects,
            autoCorrection: envelope.settings.autoCorrection,
            explanationLocale: envelope.settings.explanationLocale,
            voiceEnabled: envelope.settings.voiceEnabled,
        },
        plan: envelope.plan,
    };
}

export async function fetchSettings(): Promise<SettingsState> {
    if (USE_MOCKS) {
        await delayMock();

        return DEFAULT_SETTINGS;
    }

    return toSettingsState(await apiFetch<SettingsEnvelope>("/settings"));
}

/** Сохраняет переданные поля: сервер делает merge, поэтому тело — частичный патч, а не полный DTO. */
export async function updateSettings(patch: SettingsPatch): Promise<SettingsState> {
    if (USE_MOCKS) {
        await delayMock();

        return {
            plan: DEFAULT_SETTINGS.plan,
            preferences: { ...DEFAULT_SETTINGS.preferences, ...patch },
        };
    }

    // ARCHITECT: тело уходит объектом: apiFetch сериализует его сам и сам ставит CSRF-заголовок.
    return toSettingsState(
        await apiFetch<SettingsEnvelope>("/settings", { method: "PATCH", body: patch })
    );
}
