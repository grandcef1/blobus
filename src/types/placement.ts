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