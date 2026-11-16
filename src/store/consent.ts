// ARCHITECT: решение о согласии на аналитику и сбор ошибок. Отдельный ключ localStorage, а не поле
// в других сторах: согласие — самостоятельный факт, его отзыв не должен трогать сессию и язык.
// ARCHITECT: necessary-записи согласия не требуют и в сторе не хранятся — это константа поведения,
// а не выбор пользователя.
// ARCHITECT: analytics/Sentry (волна W7) инициализируются ТОЛЬКО при analytics === true; до согласия
// их код не загружается. Этот store — единственная точка правды для будущего гейта.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const CONSENT_STORAGE_KEY = "blobus-consent";

interface ConsentState {
    analytics: boolean;
    /** null — решения ещё не было: только тогда показывается баннер. */
    decidedAt: number | null;
    acceptAll: () => void;
    acceptNecessary: () => void;
    resetDecision: () => void;
}

export const useConsentStore = create<ConsentState>()(
    persist(
        (set) => ({
            analytics: false,
            decidedAt: null,
            acceptAll: () => set({ analytics: true, decidedAt: Date.now() }),
            acceptNecessary: () => set({ analytics: false, decidedAt: Date.now() }),
            // ARCHITECT: отзыв согласия гасит аналитику сразу, а не только снимает метку решения:
            // иначе после отзыва сбор данных продолжился бы до следующего выбора.
            resetDecision: () => set({ analytics: false, decidedAt: null }),
        }),
        { name: CONSENT_STORAGE_KEY }
    )
);
