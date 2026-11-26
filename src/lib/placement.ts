// ARCHITECT: чистая логика уровня без React и без побочных эффектов: подписи уровней, оценка аудирования и
// выбор дорожки для новой сессии. Адаптивный движок теста удалён в C-0d3b: форму из 30 вопросов и уровень
// считает сервер (server/routes/placement.ts), клиент его не пересчитывает.

import { MOCK_USER_PROGRESS } from "@/api/mocks/progress";
import type { PlacementResult } from "@/types/placement";
import type { EnglishLevel, LearningMode } from "@/types/onboarding";

/** Одна строка о том, что уровень значит на практике — без оценок и мотивации. */
// ARCHITECT: карта хранит ключи placement-неймспейса, а не готовые подписи: резолв делает потребитель
// в рендере. Переименование намеренно ломает прежних потребителей на typecheck — перевести всех
// можно только разом, и ни один не останется читать русский литерал.
export const LEVEL_DESCRIPTION_KEYS = {
    A1: "levels.a1",
    A2: "levels.a2",
    B1: "levels.b1",
    B2: "levels.b2",
    C1: "levels.c1",
    C2: "levels.c2",
} as const satisfies Record<EnglishLevel, string>;

/** Уровень аудирования по числу верных ответов. Оценка понимания на слух, не произношения. */
export function estimateListeningLevel(correct: number, total: number): EnglishLevel {
    if (total <= 0) return "A1";

    const ratio = correct / total;
    const thresholds: ReadonlyArray<{ ratio: number; level: EnglishLevel }> = [
        { ratio: 0.95, level: "C2" },
        { ratio: 0.8, level: "C1" },
        { ratio: 0.6, level: "B2" },
        { ratio: 0.4, level: "B1" },
        { ratio: 0.2, level: "A2" },
    ];

    return thresholds.find((entry) => ratio >= entry.ratio)?.level ?? "A1";
}

/** Уровень для новой сессии: дорожка теста выбирается по режиму, к которому идёт человек. */
export function levelForMode(mode: LearningMode, result: PlacementResult | null): EnglishLevel {
    if (result === null) return MOCK_USER_PROGRESS.currentLevel;

    switch (mode) {
        case "grammar":
            return result.grammar;
        case "speaking":
            return result.speaking;
        case "interview":
        case "general":
        default:
            return result.general;
    }
}
