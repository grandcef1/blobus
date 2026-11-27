// ARCHITECT: модуль-хранилище прогресса и словаря поверх моков, по образцу api/sessions: экраны
// читают данные здесь, а не из моков напрямую. Асинхронные обёртки дают скелетонам настоящее
// состояние загрузки, синхронные моки остаются источником данных.

import { apiFetch } from "@/api/client";
import type { ChatQuiz } from "@/api/chat";
import { MOCK_VOCABULARY } from "@/api/mocks/progress";
import { delayMock } from "@/api/mockDelay";
import type { SessionSummaryDto } from "@/api/sessions";
import { USE_MOCKS } from "@/lib/env";
import type { EnglishLevel } from "@/types/onboarding";
import type { VocabularyWord } from "@/types/progress";

/** Активность одного дня недели: сообщения ученика за календарный день. */
export interface ProgressDayDto {
    readonly date: string;
    readonly messages: number;
}

// ARCHITECT: сводка прогресса — ровно те метрики, которые измеряет сервер (GET /api/progress). Минут практики,
// достижений и прогресса по режимам в схеме нет, поэтому их нет и в контракте: экран не выдумывает числа.
export interface ProgressDto {
    readonly level: EnglishLevel | null;
    readonly score: number | null;
    readonly sessionsTotal: number;
    readonly messagesTotal: number;
    readonly wordsTotal: number;
    readonly wordsDueToday: number;
    readonly streakDays: number;
    readonly weeklyActivity: readonly ProgressDayDto[];
    readonly recentSessions: readonly SessionSummaryDto[];
}

/** Сообщения по дням недели от старого к новому: 0 — день без активности, а не пропуск дня. */
const MOCK_WEEK = [9, 0, 14, 6, 11, 3, 8] as const;

// ARCHITECT: мок прогресса повторяет форму серверного DTO, поэтому экран не знает, откуда пришли данные.
// Идентификаторы сессий совпадают с мок-хранилищем: «продолжить обучение» в мок-режиме ведёт в живой диалог.
export const MOCK_PROGRESS: ProgressDto = {
    level: "B1",
    score: 58,
    sessionsTotal: 2,
    messagesTotal: 34,
    wordsTotal: 23,
    wordsDueToday: 6,
    streakDays: 4,
    weeklyActivity: MOCK_WEEK.map((messages, index) => ({
        // ARCHITECT: миллисекунды суток записаны здесь числом, а не общей константой: мок-фикстура вычисляется при
        // импорте модуля, а DAY_MS объявлена ниже — обращение к ней было бы ошибкой временной зоны видимости.
        date: new Date(Date.now() - (MOCK_WEEK.length - 1 - index) * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        messages,
    })),
    recentSessions: [
        {
            id: "session_interview_1",
            tutorId: "max",
            mode: "interview",
            createdAt: "2026-11-18T09:14:00.000Z",
            updatedAt: "2026-11-18T09:41:00.000Z",
        },
        {
            id: "session_speaking_1",
            tutorId: "luna",
            mode: "speaking",
            createdAt: "2026-11-16T18:02:00.000Z",
            updatedAt: "2026-11-16T18:27:00.000Z",
        },
    ],
};

// ARCHITECT: реальный транспорт — apiFetch (cookie-сессия + 401→refresh), не apiClient: чтение аутентифицировано
// кукой. Конверт { progress } распаковывается здесь, наружу уходит DTO.
export async function fetchProgressDto(): Promise<ProgressDto> {
    if (USE_MOCKS) {
        await delayMock();

        return MOCK_PROGRESS;
    }

    const { progress } = await apiFetch<{ readonly progress: ProgressDto }>("/progress");

    return progress;
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
    /** Пример предложения (context) и его перевод: null, если перевода нет. */
    context: string | null;
    exampleTranslation: string | null;
    sourceLessonId: string | null;
    /** Шаг Лейтнера 1..5: двигается исходом повторения. */
    stage: number;
    /** Когда слово снова показывать: ISO-строка, считает сервер. */
    nextDueAt: string;
    createdAt: string;
    updatedAt: string;
}

/** Исход повторения карточки: «верно» двигает шаг вперёд, «неверно» возвращает на первый. */
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

// ARCHITECT: адаптерный мок в границах серверной схемы (term 1..120, translation <=240, context <=500,
// example_translation <=500), без PII; null остаётся null — озвучки и уровня освоения в БД нет, и через
// API они не приходят.
export const MOCK_VOCABULARY_ENTRIES: VocabularyEntryDto[] = [
    {
        id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11",
        term: "collaborate",
        translation: "сотрудничать",
        context: "We need to collaborate on this project.",
        exampleTranslation: "Нам нужно сотрудничать над этим проектом.",
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
        exampleTranslation: null,
        sourceLessonId: null,
        stage: 1,
        nextDueAt: "2026-11-15T07:10:00.000Z",
        createdAt: "2026-11-14T09:27:00.000Z",
        updatedAt: "2026-11-15T07:10:00.000Z",
    },
    {
        id: "9f4c2a10-3b7e-4d51-a0c8-4e2b1d6f7a33",
        term: "reliable",
        translation: "надёжный",
        context: "She is a reliable teammate.",
        exampleTranslation: "Она надёжный товарищ по команде.",
        sourceLessonId: null,
        stage: 2,
        nextDueAt: "2026-11-17T09:05:00.000Z",
        createdAt: "2026-11-15T11:40:00.000Z",
        updatedAt: "2026-11-17T09:05:00.000Z",
    },
    {
        id: "b6d1f0a4-7c92-4e38-9a15-3f8c5b2d9e44",
        term: "improve",
        translation: "улучшать",
        context: "I want to improve my speaking.",
        exampleTranslation: "Я хочу улучшить свою речь.",
        sourceLessonId: null,
        stage: 3,
        nextDueAt: "2026-11-19T08:20:00.000Z",
        createdAt: "2026-11-16T07:15:00.000Z",
        updatedAt: "2026-11-19T08:20:00.000Z",
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

/** Элемент очереди повторения: слово и задание к нему. Задание — та же викторина, что в чате, поэтому
 * карточка повторения рисуется существующими компонентами (gap-fill, choice, word-order). */
export interface ReviewQueueItemDto {
    readonly id: string;
    readonly stage: number;
    readonly task: ChatQuiz;
}

/**
 * Мок очереди повторения: клиент не импортирует серверный генератор (server/vocabularyReview.ts), поэтому форма
 * задания повторяется здесь — как мок-переход Лейтнера ниже. Задание то же: выбор перевода с дистракторами из
 * других слов ученика.
 */
function mockReviewQueue(entries: readonly VocabularyEntryDto[]): ReviewQueueItemDto[] {
    const queue: ReviewQueueItemDto[] = [];

    for (const entry of entries) {
        const correct = (entry.translation ?? "").trim();

        if (correct === "") continue;

        const distractors = entries
            .map((other) => (other.translation ?? "").trim())
            .filter((text) => text !== "" && text.toLowerCase() !== correct.toLowerCase())
            .slice(0, 2);

        if (distractors.length === 0) continue;

        const options = [correct, ...distractors].map((text, index) => ({
            id: String.fromCharCode(97 + index),
            text,
        }));

        queue.push({
            id: entry.id,
            stage: entry.stage,
            task: { type: "choice", prompt: entry.term, options, answerId: "a" },
        });
    }

    return queue;
}

// ARCHITECT: очередь повторения приходит готовой с сервера: задание собирает он (детерминированно и без модели),
// а клиент только проверяет ответ. Форма очереди — доверенный контракт нашего API, как и конверт списка.
export async function fetchReviewQueue(): Promise<ReviewQueueItemDto[]> {
    if (USE_MOCKS) {
        await delayMock();

        return mockReviewQueue(MOCK_VOCABULARY_ENTRIES);
    }

    const { queue } = await apiFetch<{ queue: ReviewQueueItemDto[] }>("/vocabulary/review");

    return queue;
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
