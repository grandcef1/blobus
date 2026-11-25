// ARCHITECT: данные пользователя профиля через модуль-хранилище: шапка профиля ждёт загрузку
// вместе с прогрессом, поэтому скелетон закрывает страницу целиком, а не отдельный блок.

import { apiFetch } from "@/api/client";
import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import type { MockProfileUser } from "@/api/mocks/profile";
import { delayMock } from "@/api/mockDelay";
import { USE_MOCKS } from "@/lib/env";

export async function fetchProfileUser(): Promise<MockProfileUser> {
    await delayMock();

    return MOCK_PROFILE_USER;
}

/** Контракт собственной строки профиля, который отдаёт GET /api/profile (server/routes/profile.ts). */
export interface ProfileDto {
    displayName: string;
    locale: "ru" | "en" | "es";
    dailyMinutes: number;
    memberSince: string;
    onboardingCompleted: boolean;
}

// ARCHITECT: адаптерный мок: имя переиспользуется из общего мока (§5.4), остальные поля — дефолты строки
// profiles; мок локален для адаптера и уходит, когда экран переключится на fetchProfile (A-2).
export const MOCK_PROFILE: ProfileDto = {
    displayName: MOCK_PROFILE_USER.name,
    locale: "ru",
    dailyMinutes: 20,
    memberSince: "2026-11-03T14:22:00.000Z",
    onboardingCompleted: true,
};

// ARCHITECT: реальный транспорт — apiFetch (cookie-сессия + CSRF + 401→refresh), не apiClient: чтение
// аутентифицировано кукой. Двойная реализация через USE_MOCKS по образцу billing.ts; наружу уходит только DTO.
export async function fetchProfile(): Promise<ProfileDto> {
    if (USE_MOCKS) {
        await delayMock();
        return MOCK_PROFILE;
    }

    const { profile } = await apiFetch<{ profile: ProfileDto }>("/profile");

    return profile;
}
