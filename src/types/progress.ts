    // ARCHITECT: Типы для статистики и прогресса пользователя

    import type { LearningMode, EnglishLevel } from './onboarding';

    export interface UserProgress {
    currentLevel: EnglishLevel;
    targetLevel: EnglishLevel;
    overallProgress: number; // 0-100
    modeProgress: Record<LearningMode, ModeProgress>;
    streakDays: number;
    totalStudyMinutes: number;
    weeklyActivity: DailyActivity[];
    achievements: Achievement[];
    }

    export interface ModeProgress {
    modeId: LearningMode;
    level: EnglishLevel;
    progress: number; // 0-100
    completedLessons: number;
    wordsLearned: number;
    lastActivityAt: number;
    strengths: string[]; // e.g., ["Present Tense", "Business Vocabulary"]
    weaknesses: string[]; // e.g., ["Past Perfect", "Phrasal Verbs"]
    }

    export interface DailyActivity {
    date: string; // ISO date
    minutesStudied: number;
    lessonsCompleted: number;
    wordsLearned: number;
    }

    export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string; // lucide icon name
    unlockedAt?: number; // timestamp
    progress: number; // 0-100
    target: number; // target value to unlock
    current: number; // current value
    }

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

    export interface LessonHistory {
    id: string;
    sessionId: string;
    modeId: LearningMode;
    topic: string;
    completedAt: number;
    duration: number; // minutes
    score: number; // 0-100
    wordsLearned: string[]; // word IDs
    grammarTopics: string[];
    }