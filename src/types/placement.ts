// ARCHITECT: типы адаптивного теста уровня. Методология взята у EF SET (efset.org): адаптивная
// подача вопросов, выравнивание по CEFR и шкала 0-100, полосы уровней лежат в lib/placement.
// ARCHITECT: банк заданий авторский — задания EF SET и Cambridge проприетарны и здесь не
// воспроизводятся; формулировки написаны по дескрипторам CEFR (Council of Europe).

import type { EnglishLevel } from "@/types/onboarding";

export type PlacementSkill = "grammar" | "general" | "listening";

export interface PlacementOption {
    id: string;
    text: string;
}

export interface PlacementItem {
    id: string;
    skill: PlacementSkill;
    level: EnglishLevel;
    prompt: string;
    options: PlacementOption[];
    correctOptionId: string;
    explanation?: string;
    /** Только для аудирования: предложение, которое читает синтезатор речи. */
    audioText?: string;
}

export interface PlacementResult {
    /** Балл 0-100 по полосам EF SET. */
    score: number;
    overall: EnglishLevel;
    grammar: EnglishLevel;
    /** Разговорная практика. До появления оценки устной речи на бэкенде выводится из general. */
    speaking: EnglishLevel;
    general: EnglishLevel;
    listening: EnglishLevel | null;
    listeningSkipped: boolean;
    takenAt: number;
}

/**
 * Итог проверки аудирования: уровень и число верных ответов.
 */
export interface ListeningResult {
    level: EnglishLevel;
    correctCount: number;
}

// ARCHITECT: DTO серверного банка (server/routes/placement.ts): форма уходит без верного ответа, поэтому
// correctIndex/correctOptionId/explanation здесь не появляются и появиться не могут (§16.2). Типы выше
// описывают legacy-мок (адаптивный движок) и живут до C-0d3b — их читают текущие потребители.

/** Вариант ответа серверного банка: клиент адресует вариант буквой, как и раньше. */
export interface PlacementOptionDto {
    readonly id: string;
    readonly text: string;
}

/** Вопрос формы: стем, варианты, уровень и дорожка; верного ответа здесь нет. */
export interface PlacementQuestionDto {
    readonly id: string;
    readonly skill: "grammar" | "general";
    readonly level: EnglishLevel;
    readonly prompt: string;
    readonly options: readonly PlacementOptionDto[];
}

/** Ответ пользователя: choice — индекс выбранного варианта (0..3), как в контракте сервера. */
export interface PlacementAnswerDto {
    readonly questionId: string;
    readonly choice: number;
}

/** Результат теста: балл 0-100, уровень и время замера (сервер отдаёт createdAt строкой). */
export interface PlacementResultDto {
    readonly level: EnglishLevel;
    readonly score: number;
    readonly createdAt: string;
}

/**
 * Контекст проверки аудирования: шаг мастера или отдельный экран приложения.
 * Отличается только поверхность вокруг блока — сам тест ведёт себя одинаково.
 */
export type ListeningContext = "wizard" | "standalone";
