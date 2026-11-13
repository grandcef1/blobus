// ARCHITECT: состояние сессии теста уровня живёт в сторе, а не в шаге мастера: при переходах между
// шагами компонент шага перемонтируется, и локальное состояние теряло бы вместе с собой все ответы.
// ARCHITECT: сессия уезжает в sessionStorage: перезагрузка страницы посреди теста не должна обнулять
// двадцать ответов, а закрытая вкладка — не повод хранить их дольше.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { applyAnswer, createPlacementState, nextItem } from "@/lib/placement";
import type { PlacementState } from "@/lib/placement";

export type PlacementPhase = "intro" | "questions" | "listening" | "result";

interface PlacementSessionData {
    phase: PlacementPhase;
    /** Включена ли проверка аудирования после основных вопросов. */
    includeListening: boolean;
    /** Ответы по id задания: сохранённый ответ не меняется — вопрос уже учтён в оценке. */
    answers: Record<string, string>;
    /** Номер текущего вопроса: тот же индекс, по которому считается граница последнего вопроса. */
    currentIndex: number;
    /** Адаптивное состояние движка: дорожки, очередь хода и пройденные задания. */
    trackState: PlacementState;
    /** Задания в порядке выдачи: возврат назад идёт по этой цепочке, а не по новой выборке. */
    askedItemIds: string[];
}

interface PlacementSessionActions {
    start: (includeListening: boolean) => void;
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
        answers: {},
        currentIndex: 0,
        trackState: createPlacementState(),
        askedItemIds: [],
    };
}

export const usePlacementSession = create<PlacementSession>()(
    persist(
        (set) => ({
            ...emptySession(),
            // ARCHITECT: старт — единственная точка, где прогресс теста начинается заново: он обнуляет
            // прошлую сессию и выдаёт первый вопрос.
            start: (includeListening) => {
                const fresh = createPlacementState();
                const first = nextItem(fresh);

                set({
                    phase: "questions",
                    includeListening,
                    answers: {},
                    currentIndex: 0,
                    trackState: fresh,
                    askedItemIds: first === null ? [] : [first.id],
                });
            },
            answer: (itemId, optionId) =>
                set((state) => {
                    if (state.answers[itemId] !== undefined) return {};

                    return {
                        answers: { ...state.answers, [itemId]: optionId },
                        trackState: applyAnswer(state.trackState, itemId, optionId),
                    };
                }),
            // ARCHITECT: вперёд идёт по уже выданной цепочке, а новое задание просит только на её конце:
            // возврат назад и повторное «Дальше» не пересчитывают адаптивные дорожки заново.
            goNext: () =>
                set((state) => {
                    const nextIndex = state.currentIndex + 1;
                    if (nextIndex < state.askedItemIds.length) return { currentIndex: nextIndex };

                    const upcoming = nextItem(state.trackState);
                    if (upcoming === null) return {};

                    return {
                        currentIndex: nextIndex,
                        askedItemIds: [...state.askedItemIds, upcoming.id],
                    };
                }),
            goPrev: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
            setPhase: (phase) => set({ phase }),
            setIncludeListening: (includeListening) => set({ includeListening }),
            // ARCHITECT: сброс только по явному завершению теста: навигация по мастеру его не трогает.
            reset: () => set(emptySession()),
        }),
        {
            name: "blobus-placement",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);