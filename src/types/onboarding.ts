    // ARCHITECT: Типы онбординга — использует BlobatarId вместо RepetitorId

    import type { BlobatarId } from "./blobatar";

    export type LearningMode = "interview" | "speaking" | "grammar" | "general";

    export type EnglishLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

    export interface SchedulePreference {
    frequency: "daily" | "every-other-day" | "3-times-week" | "weekly";
    durationMinutes: 15 | 30 | 45 | 60;
    preferredTimeSlots: string[];
    }

    export interface OnboardingData {
    blobatarId: BlobatarId | null;
    learningMode: LearningMode | null;
    englishLevel: EnglishLevel | null;
    schedule: SchedulePreference | null;
    completedSteps: number[];
    }

    export type OnboardingStep =
    | "welcome"
    | "auth"
    | "blobatar-selection"
    | "mode-selection"
    | "schedule"
    | "assessment"
    | "complete";