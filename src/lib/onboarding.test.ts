// ARCHITECT: адрес решает только стартовый шаг мастера, поэтому правило живёт отдельной чистой функцией
// и проверяется без рендера всего мастера: страница не должна сама фильтровать значения адреса.

import { describe, expect, it } from "vitest";
import { resolveOnboardingStep } from "@/lib/onboarding";
import type { OnboardingStep } from "@/types/onboarding";

const FULL_STEPS: readonly OnboardingStep[] = [
    "intro",
    "assessment",
    "goals",
    "schedule",
    "lesson",
];
const SESSION_STEPS: readonly OnboardingStep[] = ["blobatar-selection", "mode-selection"];

describe("resolveOnboardingStep", () => {
    it("принимает шаг, который есть в этом флоу", () => {
        expect(resolveOnboardingStep(FULL_STEPS, "assessment", "intro")).toBe("assessment");
        expect(resolveOnboardingStep(SESSION_STEPS, "mode-selection", "blobatar-selection")).toBe(
            "mode-selection"
        );
    });

    it("возвращает первый шаг на пустой адрес и на мусор", () => {
        expect(resolveOnboardingStep(FULL_STEPS, null, "intro")).toBe("intro");
        expect(resolveOnboardingStep(FULL_STEPS, "", "intro")).toBe("intro");
        expect(resolveOnboardingStep(FULL_STEPS, "549", "intro")).toBe("intro");
    });

    it("не пускает в шаг чужого флоу и в служебное значение", () => {
        expect(resolveOnboardingStep(SESSION_STEPS, "assessment", "blobatar-selection")).toBe(
            "blobatar-selection"
        );
        expect(resolveOnboardingStep(FULL_STEPS, "complete", "intro")).toBe("intro");
    });
});
