// ARCHITECT: модуль-хранилище прогресса и словаря поверх моков, по образцу api/sessions: экраны
// читают данные здесь, а не из моков напрямую. Асинхронные обёртки дают скелетонам настоящее
// состояние загрузки, синхронные моки остаются источником данных.

import { apiFetch } from "@/api/client";
import { MOCK_USER_PROGRESS, MOCK_VOCABULARY } from "@/api/mocks/progress";
import { delayMock } from "@/api/mockDelay";
import { USE_MOCKS } from "@/lib/env";
import type { UserProgress, VocabularyWord } from "@/types/progress";

export async function fetchUserProgress(): Promise<UserProgress> {
    await delayMock();

    return MOCK_USER_PROGRESS;
}

export async function fetchVocabulary(): Promise<VocabularyWord[]> {
    await delayMock();

    return MOCK_VOCABULARY;
}

/** Слово своего словаря: контракт GET /api/vocabulary; user_id наружу не отдаётся. */
export interface VocabularyEntryDto {
    id: string;
    term: string;
    translation: string | null;
    context: string | null;
    sourceLessonId: string | null;
    createdAt: string;
    updatedAt: string;
}

// ARCHITECT: адаптерный мок в границах серверной схемы (term 1..120, translation <=240, context <=500),
// без PII; null остаётся null — озвучки, уровня освоения и примеров в БД нет, и через API они не приходят.
export const MOCK_VOCABULARY_ENTRIES: VocabularyEntryDto[] = [
    {
        id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11",
        term: "collaborate",
        translation: "сотрудничать",
        context: "We need to collaborate on this project.",
        sourceLessonId: null,
        createdAt: "2026-11-16T18:02:00.000Z",
        updatedAt: "2026-11-16T18:02:00.000Z",
    },
    {
        id: "7e2b4c91-5d68-4a3f-8b1c-2f9a0d7e6b22",
        term: "deadline",
        translation: null,
        context: null,
        sourceLessonId: null,
        createdAt: "2026-11-14T09:27:00.000Z",
        updatedAt: "2026-11-15T07:10:00.000Z",
    },
];

// ARCHITECT: реальный транспорт — apiFetch (cookie-сессия + CSRF + 401→refresh), не apiClient: чтение
// аутентифицировано кукой. Конверт { vocabulary } распаковывается здесь, наружу уходит массив DTO.
export async function fetchVocabularyEntries(): Promise<VocabularyEntryDto[]> {
    if (USE_MOCKS) {
        await delayMock();
        return MOCK_VOCABULARY_ENTRIES;
    }

    const { vocabulary } = await apiFetch<{ vocabulary: VocabularyEntryDto[] }>("/vocabulary");

    return vocabulary;
}
