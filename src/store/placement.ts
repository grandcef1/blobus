// ARCHITECT: состояние сессии теста уровня живёт в сторе, а не в шаге мастера: при переходах между
// шагами компонент шага перемонтируется, и локальное состояние теряло бы вместе с собой все ответы.
// ARCHITECT: сессия уезжает в sessionStorage: перезагрузка страницы посреди теста не должна обнулять
// тридцать ответов, а закрытая вкладка — не повод хранить их дольше.
// ARCHITECT: форма фиксированная (30 вопросов от сервера), поэтому движка в сторе нет: банк приходит с
// сервера, а порядок задан currentIndex по этому банку.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlacementQuestionDto } from "@/types/placement";

export type PlacementPhase = "intro" | "questions" | "listening" | "result";

interface PlacementSessionData {
    phase: PlacementPhase;
    /** Включена ли проверка аудирования после основных вопросов. */
    includeListening: boolean;
    /** Банк формы: вопросы приходят при старте теста, в интро список пуст. */
    questions: PlacementQuestionDto[];
    /** Ответы по id задания: сохранённый ответ не меняется — он уже учитывается в серверном балле. */
    answers: Record<string, string>;
    /** Номер текущего вопроса: индекс в банке. */
    currentIndex: number;
}

interface PlacementSessionActions {
    /** Старт: сбрасывает прошлую сессию и кладёт уже загруженный банк. */
    start: (includeListening: boolean, questions: readonly PlacementQuestionDto[]) => void;
    answer: (itemId: string, optionId: string) => void;
    goNext: () => void;
    goPrev: () => void;
    setPhase: (phase: PlacementPhase) => void;
    setIncludeListening: (value: boolean) => void;
    reset: () => void;
}

export type PlacementSession = PlacementSessionData & PlacementSessionActions;

function emptySession(): PlacementSessionData {
    return {
        phase: "intro",
        includeListening: false,
        questions: [],
        answers: {},
        currentIndex: 0,
    };
}

export const usePlacementSession = create<PlacementSession>()(
    persist<PlacementSession, [], [], PlacementSessionData>(
        (set) => ({
            ...emptySession(),
            // ARCHITECT: старт — единственная точка, где прогресс теста начинается заново: он обнуляет
            // прошлую сессию и ставит загруженный банк.
            start: (includeListening, questions) =>
                set({
                    phase: "questions",
                    includeListening,
                    questions: [...questions],
                    answers: {},
                    currentIndex: 0,
                }),
            // ARCHITECT: ответ фиксируется один раз: повторный клик (в том числе после возврата назад) не
            // переписывает выбор, который уже ушёл в серверный скоринг.
            answer: (itemId, optionId) =>
                set((state) =>
                    state.answers[itemId] === undefined
                        ? { answers: { ...state.answers, [itemId]: optionId } }
                        : {}
                ),
            goNext: () =>
                set((state) => ({
                    currentIndex: Math.min(
                        state.currentIndex + 1,
                        Math.max(0, state.questions.length - 1)
                    ),
                })),
            goPrev: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
            setPhase: (phase) => set({ phase }),
            setIncludeListening: (includeListening) => set({ includeListening }),
            // ARCHITECT: сброс только по явному завершению теста: навигация по мастеру его не трогает.
            reset: () => set(emptySession()),
        }),
        {
            name: "blobus-placement",
            storage: createJSONStorage(() => sessionStorage),
            // ARCHITECT: адаптивная сессия (v0) несовместима с фиксированной формой: смена версии сбрасывает
            // её в пустой старт, поэтому старые trackState/askedItemIds не читаются вовсе.
            version: 1,
            migrate: () => emptySession(),
            merge: (persisted, current) => {
                // ARCHITECT: повреждённое состояние (фаза вопросов без загруженного банка, чужой shape) не
                // восстанавливаем: иначе шаг открылся бы пустым экраном без вопроса и без выхода.
                const restored = persisted as Partial<PlacementSessionData> | undefined;

                if (restored === undefined || !Array.isArray(restored.questions)) return current;
                if (restored.phase !== "intro" && restored.questions.length === 0) return current;

                return { ...current, ...restored };
            },
        }
    )
);
