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
    /** Шаг Лейтнера 1..5: двигается исходом повторения. */
    stage: number;
    /** Когда слово снова показывать: ISO-строка, считает сервер. */
    nextDueAt: string;
    createdAt: string;
    updatedAt: string;
}

/** Исход повторения карточки: «помню» двигает шаг вперёд, «забыл» возвращает на первый. */
export type ReviewOutcome = "remembered" | "forgotten";

// ARCHITECT: мок повторяет серверный переход по шагам Лейтнера (server/routes/vocabulary.ts), потому что
// клиент не импортирует серверный модуль; одинаковые интервалы закреплены тестами обеих сторон.
const REVIEW_INTERVAL_DAYS: readonly number[] = [1, 3, 7, 14, 30];
const REVIEW_MAX_STAGE = 5;
const PINNED_INTERVAL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function nextReviewStep(
    stage: number,
    outcome: ReviewOutcome
): { readonly stage: number; readonly intervalDays: number } {
    if (outcome === "forgotten") return { stage: 1, intervalDays: 1 };

    const nextStage = Math.min(stage + 1, REVIEW_MAX_STAGE);
    // ARCHITECT: закреплённое слово (шаг 5) остаётся на пятом шаге и уходит на 90 дней, как на сервере.
    const intervalDays =
        stage === REVIEW_MAX_STAGE ? PINNED_INTERVAL_DAYS : REVIEW_INTERVAL_DAYS[nextStage - 1];

    return { stage: nextStage, intervalDays };
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
        stage: 1,
        nextDueAt: "2026-11-16T18:02:00.000Z",
        createdAt: "2026-11-16T18:02:00.000Z",
        updatedAt: "2026-11-16T18:02:00.000Z",
    },
    {
        id: "7e2b4c91-5d68-4a3f-8b1c-2f9a0d7e6b22",
        term: "deadline",
        translation: null,
        context: null,
        sourceLessonId: null,
        stage: 1,
        nextDueAt: "2026-11-15T07:10:00.000Z",
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

/** Тело добавления слова: ровно поля контракта POST /api/vocabulary, без user_id и source_lesson_id. */
export interface AddVocabularyInput {
    term: string;
    translation?: string | null;
    context?: string | null;
}

// ARCHITECT: мок-ветка повторяет серверную идемпотентность: дубль по lower(term) возвращает существующую
// запись, новое слово добавляется в мок-список. real-ветка — мутация через apiFetch (CSRF и refresh внутри
// транспорта), конверт { entry } распаковывается здесь.
export async function addVocabularyEntry(input: AddVocabularyInput): Promise<VocabularyEntryDto> {
    if (USE_MOCKS) {
        await delayMock();
        const term = input.term.trim();
        const existing = MOCK_VOCABULARY_ENTRIES.find(
            (entry) => entry.term.toLowerCase() === term.toLowerCase()
        );

        if (existing !== undefined) return existing;

        const now = new Date().toISOString();
        const entry: VocabularyEntryDto = {
            id: crypto.randomUUID(),
            term,
            translation: input.translation ?? null,
            context: input.context ?? null,
            sourceLessonId: null,
            stage: 1,
            nextDueAt: now,
            createdAt: now,
            updatedAt: now,
        };

        MOCK_VOCABULARY_ENTRIES.push(entry);

        return entry;
    }

    // ARCHITECT: тело уходит объектом: apiFetch сериализует его сам, строка была бы JSON-строкой внутри JSON.
    const { entry } = await apiFetch<{ entry: VocabularyEntryDto }>("/vocabulary", {
        method: "POST",
        body: input,
    });

    return entry;
}

// ARCHITECT: запись исхода повторения: шаг и дату следующего показа считает сервер, клиент только сообщает
// «помню»/«забыл». Мок двигает ту же запись в MOCK_VOCABULARY_ENTRIES, чтобы повторный рендер увидел новый шаг.
export async function markWordReviewed(
    id: string,
    outcome: ReviewOutcome
): Promise<VocabularyEntryDto> {
    if (USE_MOCKS) {
        await delayMock();
        const entry = MOCK_VOCABULARY_ENTRIES.find((item) => item.id === id);

        if (entry === undefined) throw new Error(`Слово не найдено: ${id}`);

        const step = nextReviewStep(entry.stage, outcome);

        entry.stage = step.stage;
        entry.nextDueAt = new Date(Date.now() + step.intervalDays * DAY_MS).toISOString();
        entry.updatedAt = new Date().toISOString();

        return entry;
    }

    const { entry } = await apiFetch<{ entry: VocabularyEntryDto }>(`/vocabulary/${id}`, {
        method: "PATCH",
        body: { reviewed: outcome },
    });

    return entry;
}
