// ARCHITECT: модуль-хранилище сессий поверх моков. Одна точка, откуда UI читает список
// (сайдбар, дашборд, страница сессий) и куда попадают сессии, созданные в мастере. Пока
// бэкенда нет, состояние живёт в массиве на время загрузки страницы: новая сессия и её
// сообщения видны без перезагрузки, а сам файл моков остаётся константой.

import { MOCK_SESSIONS } from "@/api/mocks/sessions";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
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

const SESSION_USER_ID = "user_1";
const PLANNED_LESSON_COUNT = 8;

// ARCHITECT: первая реплика репетитора зависит от режима — чат открывается по теме, а не
// пустым экраном. Без эмодзи и восклицаний, как и весь микрокоп приложения.
const OPENING_MESSAGES: Record<LearningMode, string> = {
    interview:
        "Начнём с типичного вопроса на собеседовании. Расскажи о случае, когда тебе пришлось работать под давлением дедлайна.",
    speaking: "Начнём с простого разговора. Расскажи на английском, чем ты занимался на этой неделе.",
    grammar:
        "Начнём с одного правила и сразу применим его. Составь предложение в прошедшем простом времени о вчерашнем дне.",
    general: "Начнём с повседневной темы. What did you do today? Отвечай на английском, я поправлю при необходимости.",
};

const sessions: EnhancedChatSession[] = [...MOCK_SESSIONS];

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
        title: modeLabel ? `Новая сессия · ${modeLabel}` : "Новая сессия",
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
        messages: [
            {
                id: crypto.randomUUID(),
                sessionId,
                role: "assistant",
                content: OPENING_MESSAGES[input.learningMode],
                timestamp: now,
                type: "text",
            },
        ],
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
