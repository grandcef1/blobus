// ARCHITECT: данные пользователя профиля через модуль-хранилище: шапка профиля ждёт загрузку
// вместе с прогрессом, поэтому скелетон закрывает страницу целиком, а не отдельный блок.

import { MOCK_PROFILE_USER } from "@/api/mocks/profile";
import type { MockProfileUser } from "@/api/mocks/profile";
import { delayMock } from "@/api/mockDelay";

export async function fetchProfileUser(): Promise<MockProfileUser> {
    await delayMock();

    return MOCK_PROFILE_USER;
}