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

    // ARCHITECT: пять шагов мастера. Значения-фазы (welcome, auth, blobatar-selection,
    // mode-selection) остались в типе для совместимости: наружу шаги показываются как intro,
    // assessment, goals, schedule, lesson — по одному номеру на шаг.
    export type OnboardingStep =
    | "welcome"
    | "auth"
    | "blobatar-selection"
    | "mode-selection"
    | "schedule"
    | "assessment"
    | "complete"
    | "intro"
    | "goals"
    | "lesson";

    // ARCHITECT: названия шагов — один источник и для мастера, и для чеклиста лендинга
    // («10 минут до старта»): подписи не могут разойтись.
    export const ONBOARDING_STEP_TITLES = {
    intro: "Знакомство",
    assessment: "Тест",
    goals: "Цели",
    schedule: "Расписание",
    lesson: "Урок",
    } as const;

    export type OnboardingFullStep = keyof typeof ONBOARDING_STEP_TITLES;