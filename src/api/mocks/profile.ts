// ARCHITECT: данные текущего пользователя для интерфейса. Имя и тариф показываются в двух
// местах (карточка профиля в сайдбаре и шапка страницы профиля), поэтому лежат в одном
// модуле, а не хардкодятся в каждом. Появится бэкенд — здесь единственная точка замены.

import type { BlobatarId } from "@/types/blobatar";

export interface MockProfileUser {
    blobatarId: BlobatarId;
    name: string;
    email: string;
    planLabel: string;
    memberSince: string;
}

export const MOCK_PROFILE_USER: MockProfileUser = {
    blobatarId: "alex",
    name: "Алекс Разработчик",
    email: "alex@blobus.ai",
    planLabel: "Тариф Free",
    memberSince: "Ноябрь 2026",
};
