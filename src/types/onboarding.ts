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

    // ARCHITECT: юнион объявлен независимо, чтобы satisfies проверял полноту карты: добавили шаг в юнион,
    // забыли в карте — typecheck упадёт; вывод типа из карты такой защиты не даёт.
    export type OnboardingFullStep = "intro" | "assessment" | "goals" | "schedule" | "lesson";

    // ARCHITECT: трёхфазная миграция подписей шагов (expand → migrate → contract) завершена: карта хранит ключи
    // common-неймспейса, резолв делает потребитель в рендере; старая карта русских подписей удалена.
    export const ONBOARDING_STEP_TITLE_KEYS = {
    intro: "steps.intro",
    assessment: "steps.assessment",
    goals: "steps.goals",
    schedule: "steps.schedule",
    lesson: "steps.lesson",
    } as const satisfies Record<OnboardingFullStep, string>;
