// ARCHITECT: настройки через модуль-адаптер: гейт USE_MOCKS как в api/profile.ts — мок-ветка отдаёт дефолты,
// real-ветка ходит в /api/settings (cookie-сессия и CSRF внутри apiFetch). Форма ответа одинакова в обеих
// ветках, наружу уходит только SettingsState.

import { apiFetch } from "@/api/client";
import { delayMock } from "@/api/mockDelay";
import { USE_MOCKS } from "@/lib/env";
import type { SettingsState } from "@/types/settings";

/** Два toggle, которые страница реально рендерит: остальных полей у сервера нет. */
export type SettingsPreferences = SettingsState["preferences"];

export const DEFAULT_SETTINGS: SettingsState = {
    preferences: { soundEffects: true, autoCorrection: true },
};

/** Конверт ответа GET/PATCH /api/settings (server/routes/settings.ts). */
interface SettingsEnvelope {
    settings: SettingsPreferences;
}

// ARCHITECT: маппер один на чтение и запись: форма серверного конверта не покидает модуль (§16.13).
function toSettingsState(envelope: SettingsEnvelope): SettingsState {
    return {
        preferences: {
            soundEffects: envelope.settings.soundEffects,
            autoCorrection: envelope.settings.autoCorrection,
        },
    };
}

export async function fetchSettings(): Promise<SettingsState> {
    if (USE_MOCKS) {
        await delayMock();

        return DEFAULT_SETTINGS;
    }

    return toSettingsState(await apiFetch<SettingsEnvelope>("/settings"));
}

/** Сохраняет оба toggle целиком: у сервера полный DTO, частичных патчей нет. */
export async function updateSettings(preferences: SettingsPreferences): Promise<SettingsState> {
    if (USE_MOCKS) {
        await delayMock();

        return { preferences };
    }

    // ARCHITECT: тело уходит объектом: apiFetch сериализует его сам и сам ставит CSRF-заголовок.
    return toSettingsState(
        await apiFetch<SettingsEnvelope>("/settings", { method: "PATCH", body: preferences })
    );
}
