// ARCHITECT: действия сессии выполняет страница — мок-ветка пишет в мок-стор, реальная идёт в PATCH/DELETE/reset
// (§16.2: клиент не решает, куда писать). Меню и диалоги только показывают пункты и подтверждения.
import type { LearningMode } from "@/types/onboarding";

/** Действия сессии из шапки чата и меню строки списка. Все — асинхронные: ошибку показывает страница. */
export interface SessionActions {
    readonly rename: (title: string) => Promise<void>;
    readonly changeTutor: (tutorId: string) => Promise<void>;
    readonly reset: () => Promise<void>;
    readonly remove: () => Promise<void>;
    /** Смена режима: у реальной сессии режим не меняется (PATCH принимает только название и репетитора). */
    readonly changeMode?: (mode: LearningMode) => Promise<void>;
    /** Сброс только счётчиков прогресса: есть только у мок-стора, где счётчики живут в сессии. */
    readonly resetProgress?: () => Promise<void>;
}
