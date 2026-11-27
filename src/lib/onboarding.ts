// ARCHITECT: шаг мастера из адреса (?step=assessment): по этой ссылке приходит новый аккаунт после
// регистрации, чтобы сразу попасть на тест уровня. Разбор адреса — чистая функция: страница мастера
// не решает, какие значения допустимы, а правило проверяется тестом без рендера всего мастера.

import type { OnboardingStep } from "@/types/onboarding";

/** Шаг из адреса, если он есть в этом флоу мастера; иначе — первый шаг флоу. */
export function resolveOnboardingStep(
    order: readonly OnboardingStep[],
    requested: string | null,
    fallback: OnboardingStep
): OnboardingStep {
    return order.find((step) => step === requested) ?? fallback;
}
