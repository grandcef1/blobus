// ARCHITECT: модуль-хранилище прогресса и словаря поверх моков, по образцу api/sessions: экраны
// читают данные здесь, а не из моков напрямую. Асинхронные обёртки дают скелетонам настоящее
// состояние загрузки, синхронные моки остаются источником данных.

import { MOCK_USER_PROGRESS, MOCK_VOCABULARY } from "@/api/mocks/progress";
import { delayMock } from "@/api/mockDelay";
import type { UserProgress, VocabularyWord } from "@/types/progress";

export async function fetchUserProgress(): Promise<UserProgress> {
    await delayMock();

    return MOCK_USER_PROGRESS;
}

export async function fetchVocabulary(): Promise<VocabularyWord[]> {
    await delayMock();

    return MOCK_VOCABULARY;
}