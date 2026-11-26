// ARCHITECT: типы прогресса и словаря. UserProgress, ModeProgress, DailyActivity, Achievement и LessonHistory
// удалены вместе с мок-метриками: их место занял серверный ProgressDto (src/api/progress.ts), а здесь осталось
// только то, что читает интерфейс мок-режима.

import type { LearningMode } from "./onboarding";

export interface VocabularyWord {
    id: string;
    word: string;
    translation: string;
    pronunciation: string;
    partOfSpeech: string;
    examples: Array<{
        sentence: string;
        translation?: string;
    }>;
    learnedAt: number; // timestamp
    lastReviewedAt: number;
    reviewCount: number;
    mastery: number; // 0-100, how well user knows this word
    modeIds: LearningMode[]; // which modes this word appeared in
}
