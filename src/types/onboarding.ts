    // ARCHITECT: Типы для онбординга и персонализации репетиторов

    export type RepetitorId = 'aria' | 'max' | 'sophia' | 'oliver';

    export type LearningMode = 'interview' | 'speaking' | 'grammar' | 'general';

    export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

    export interface Repetitor {
    id: RepetitorId;
    name: string;
    personality: string;
    backstory: string;
    voiceAccent: 'british' | 'american' | 'australian';
    avatarColor: string; // HEX color for blobatar
    specialties: LearningMode[];
    teachingStyle: 'encouraging' | 'structured' | 'casual' | 'professional';
    }

    export interface LearningModeConfig {
    id: LearningMode;
    label: string;
    description: string;
    icon: string; // lucide icon name
    recommendedRepetitors: RepetitorId[];
    }

    export interface SchedulePreference {
    frequency: 'daily' | 'every-other-day' | '3-times-week' | 'weekly';
    durationMinutes: 15 | 30 | 45 | 60;
    preferredTimeSlots: string[]; // "morning", "afternoon", "evening"
    }

    export interface OnboardingData {
    repetitorId: RepetitorId | null;
    learningMode: LearningMode | null;
    englishLevel: EnglishLevel | null;
    schedule: SchedulePreference | null;
    completedSteps: number[];
    }

    export type OnboardingStep = 
    | 'welcome'
    | 'auth'
    | 'repetitor-selection'
    | 'mode-selection'
    | 'schedule'
    | 'assessment'
    | 'complete';