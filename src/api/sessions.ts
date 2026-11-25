// ARCHITECT: модуль-хранилище сессий поверх моков. Одна точка, откуда UI читает список
// (сайдбар, дашборд, страница сессий) и куда попадают сессии, созданные в мастере. Пока
// бэкенда нет, состояние живёт в массиве на время загрузки страницы: новая сессия и её
// сообщения видны без перезагрузки, а сам файл моков остаётся константой.

import { apiFetch } from "@/api/client";
import { MOCK_SESSIONS } from "@/api/mocks/sessions";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { delayMock } from "@/api/mockDelay";
import i18n from "@/lib/i18n";
import { USE_MOCKS } from "@/lib/env";
import type { EnhancedChatSession, EnhancedMessage } from "@/types/session";
import type { BlobatarId } from "@/types/blobatar";
import type { EnglishLevel, LearningMode } from "@/types/onboarding";

export interface CreateSessionInput {
    repetitorId: BlobatarId;
    learningMode: LearningMode;
    targetLevel?: EnglishLevel | null;
}

export interface AppendMessageInput {
    role: EnhancedMessage["role"];
    content: string;
}

/** Поля сессии, которые можно править из интерфейса без пересоздания диалога. */
export type SessionPatch = Partial<
    Pick<EnhancedChatSession, "title" | "repetitorId" | "learningMode" | "targetLevel">
>;

const SESSION_USER_ID = "user_1";
const PLANNED_LESSON_COUNT = 8;

// ARCHITECT: первая реплика репетитора зависит от режима — чат открывается по теме, а не
// пустым экраном. Без эмодзи и восклицаний, как и весь микрокоп приложения.
const OPENING_MESSAGE_KEYS = {
    interview: "sessions.opening.interview",
    speaking: "sessions.opening.speaking",
    grammar: "sessions.opening.grammar",
    general: "sessions.opening.general",
} as const satisfies Record<LearningMode, string>;

const sessions: EnhancedChatSession[] = [...MOCK_SESSIONS];

// ARCHITECT: приветствие по режиму — одна точка сборки: и создание сессии, и очистка истории
// должны давать одинаковую стартовую реплику.
function createOpeningMessage(
    sessionId: string,
    learningMode: string,
    timestamp: number
): EnhancedMessage {
    return {
        id: crypto.randomUUID(),
        sessionId,
        role: "assistant",
        content: i18n.t(
            OPENING_MESSAGE_KEYS[learningMode as LearningMode] ?? OPENING_MESSAGE_KEYS.general,
            { ns: "common" }
        ),
        timestamp,
        type: "text",
    };
}

export function getSessions(): EnhancedChatSession[] {
    return [...sessions].sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

export function getSessionById(sessionId: string): EnhancedChatSession | undefined {
    return sessions.find((session) => session.id === sessionId);
}

export function createSession(input: CreateSessionInput): EnhancedChatSession {
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const modeLabel = MOCK_LEARNING_MODES.find((mode) => mode.id === input.learningMode)?.label;

    const session: EnhancedChatSession = {
        id: sessionId,
        userId: SESSION_USER_ID,
        title: modeLabel
            ? i18n.t("sessions.newTitle", { ns: "common", mode: modeLabel })
            : i18n.t("states.empty.sessions.action", { ns: "common" }),
        createdAt: now,
        repetitorId: input.repetitorId,
        learningMode: input.learningMode,
        targetLevel: input.targetLevel ?? undefined,
        progress: {
            completedLessons: 0,
            totalLessons: PLANNED_LESSON_COUNT,
            wordsLearned: 0,
            streakDays: 0,
        },
        lastActivityAt: now,
        messages: [createOpeningMessage(sessionId, input.learningMode, now)],
    };

    sessions.unshift(session);

    return session;
}

export function appendMessage(
    sessionId: string,
    input: AppendMessageInput
): EnhancedChatSession | undefined {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return undefined;

    const now = Date.now();
    const message: EnhancedMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: input.role,
        content: input.content,
        timestamp: now,
        type: "text",
    };

    const updated: EnhancedChatSession = {
        ...sessions[index],
        lastActivityAt: now,
        messages: [...sessions[index].messages, message],
    };

    sessions[index] = updated;

    return updated;
}

// ARCHITECT: правки сессии из меню шапки. Функции иммутабельны и возвращают обновлённую сессию:
// UI кладёт её в своё состояние, а не перечитывает список целиком.
// ARCHITECT: lastActivityAt двигают только действия с сообщениями. Переименование и смена
// контекста — не активность в диалоге, иначе порядок «свежие сверху» начнёт врать.
export function updateSession(
    sessionId: string,
    patch: SessionPatch
): EnhancedChatSession | undefined {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return undefined;

    const updated: EnhancedChatSession = { ...sessions[index], ...patch };
    sessions[index] = updated;

    return updated;
}

export function resetSessionProgress(sessionId: string): EnhancedChatSession | undefined {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return undefined;

    const current = sessions[index];
    const updated: EnhancedChatSession = {
        ...current,
        progress: { ...current.progress, completedLessons: 0, wordsLearned: 0, streakDays: 0 },
    };
    sessions[index] = updated;

    return updated;
}

// ARCHITECT: очистка истории возвращает сессию к стартовому состоянию — одно приветствие
// выбранного режима. Выборочно сообщения не удаляются: так «очистить» читается однозначно.
export function clearSessionMessages(sessionId: string): EnhancedChatSession | undefined {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return undefined;

    const current = sessions[index];
    const now = Date.now();
    const updated: EnhancedChatSession = {
        ...current,
        lastActivityAt: now,
        messages: [createOpeningMessage(sessionId, current.learningMode, now)],
    };
    sessions[index] = updated;

    return updated;
}

export function deleteSession(sessionId: string): boolean {
    const index = sessions.findIndex((session) => session.id === sessionId);
    if (index < 0) return false;

    sessions.splice(index, 1);

    return true;
}

// ARCHITECT: асинхронные обёртки для экранов: скелетон должен быть состоянием загрузки, а не
// декорацией. Синхронные геттеры остаются — их читает уже загруженный экран (шапка, меню, лента).
export async function fetchSessions(): Promise<EnhancedChatSession[]> {
    await delayMock();

    return getSessions();
}

export async function fetchSessionById(sessionId: string): Promise<EnhancedChatSession | null> {
    await delayMock();

    return getSessionById(sessionId) ?? null;
}

/** Сводка своей сессии: контракт GET /api/sessions (server/routes/sessions.ts), без названия и user_id. */
export interface SessionSummaryDto {
    id: string;
    tutorId: string;
    mode: string;
    createdAt: string;
    updatedAt: string;
}

// ARCHITECT: адаптерный мок списка: нейтральные записи в границах серверной схемы (mode 1..32,
// tutor_id 1..64), без PII и без названия — такой колонки в public.sessions нет.
export const MOCK_SESSION_SUMMARIES: SessionSummaryDto[] = [
    {
        id: "8f1c2e5a-1c3b-4d2e-9a7f-2b6c4d8e0a11",
        tutorId: "miya",
        mode: "speaking",
        createdAt: "2026-11-18T09:14:00.000Z",
        updatedAt: "2026-11-18T09:41:00.000Z",
    },
    {
        id: "3a7d9b40-5e21-4c8a-b1f6-7c2e9d0a4b52",
        tutorId: "nova",
        mode: "grammar",
        createdAt: "2026-11-16T18:02:00.000Z",
        updatedAt: "2026-11-16T18:27:00.000Z",
    },
];

// ARCHITECT: реальный транспорт — apiFetch (cookie-сессия + CSRF + 401→refresh), не apiClient: чтение
// аутентифицировано кукой. Двойная реализация через USE_MOCKS по образцу profile.ts; ресурсный конверт
// { sessions } распаковывается здесь, наружу уходит массив DTO.
export async function fetchSessionSummaries(): Promise<SessionSummaryDto[]> {
    if (USE_MOCKS) {
        await delayMock();
        return MOCK_SESSION_SUMMARIES;
    }

    const { sessions } = await apiFetch<{ sessions: SessionSummaryDto[] }>("/sessions");

    return sessions;
}
