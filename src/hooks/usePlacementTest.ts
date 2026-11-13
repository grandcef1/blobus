// ARCHITECT: логика шага теста — состояние сессии, производные значения и переходы между фазами.
// Вынесена из компонента: шаг остаётся разметкой фаз, а правила (что считается последним вопросом,
// когда собирается результат, когда сессия закрывается) читаются в одном месте.
// ARCHITECT: сама сессия живёт в сторе: мастер перемонтирует шаг при переходах между шагами, и
// локальное состояние уносило бы с собой ответы.
// ARCHITECT: пройденный тест не предлагается заново: сохранённый результат открывает шаг сразу на
// экране итога, иначе возврат назад по мастеру обнулял бы уже определённый уровень.

import { useState } from "react";
import { getResult, saveResult } from "@/api/placement";
import { finalize, findPlacementItem, totalQuestions } from "@/lib/placement";
import { usePlacementSession } from "@/store/placement";
import type { PlacementPhase } from "@/store/placement";
import type { PlacementItem, PlacementResult } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";

interface PlacementTestController {
    phase: PlacementPhase;
    savedResult: PlacementResult | null;
    item: PlacementItem | null;
    questionNumber: number;
    total: number;
    selectedOptionId: string | null;
    includeListening: boolean;
    isLastQuestion: boolean;
    /** Есть незаконченная сессия: кнопка описания продолжает её, а не начинает заново. */
    hasProgress: boolean;
    answer: (optionId: string) => void;
    advance: () => void;
    back: () => void;
    startOrResume: () => void;
    toggleListening: (value: boolean) => void;
    finishListening: (level: EnglishLevel) => void;
    /** Выход из сводки: закрывает сессию и отдаёт уровень мастеру. */
    complete: () => void;
}

export function usePlacementTest(onComplete: (level: EnglishLevel) => void): PlacementTestController {
    const {
        phase: sessionPhase,
        includeListening,
        answers,
        currentIndex,
        trackState,
        askedItemIds,
        start,
        answer,
        goNext,
        goPrev,
        setPhase,
        setIncludeListening,
        reset,
    } = usePlacementSession();

    const [savedResult, setSavedResult] = useState<PlacementResult | null>(() => getResult());

    const total = totalQuestions();
    const hasProgress = askedItemIds.length > 0;
    // ARCHITECT: незаконченная сессия важнее сохранённого результата: она и есть текущий прогресс,
    // поэтому возврат на шаг продолжает тест, а не показывает чужой итог.
    const isTestInProgress = hasProgress && sessionPhase !== "result";
    const phase: PlacementPhase = isTestInProgress || savedResult === null ? sessionPhase : "result";

    const itemId = askedItemIds[currentIndex] ?? null;
    const item = itemId === null ? null : findPlacementItem(itemId);
    const questionNumber = currentIndex + 1;
    const selectedOptionId = itemId === null ? null : (answers[itemId] ?? null);
    // ARCHITECT: номер вопроса и граница последнего считаются от одного индекса, поэтому подпись
    // кнопки переключается ровно на двадцатом вопросе, а не после ответа на девятнадцатый.
    const isLastQuestion = questionNumber === total;

    const finish = (listening: EnglishLevel | null) => {
        const finished = finalize(trackState, listening);
        saveResult(finished);
        setSavedResult(finished);
        setPhase("result");
    };

    const handleAdvance = () => {
        if (!isLastQuestion) {
            goNext();
            return;
        }

        // ARCHITECT: аудирование идёт сразу после основных вопросов, если его включили в описании
        // теста: результат тогда собирается один — с уровнем аудирования внутри.
        if (includeListening) {
            setPhase("listening");
            return;
        }

        finish(null);
    };

    return {
        phase,
        savedResult,
        item,
        questionNumber,
        total,
        selectedOptionId,
        includeListening,
        isLastQuestion,
        hasProgress,
        answer: (optionId) => {
            if (item === null || selectedOptionId !== null) return;
            answer(item.id, optionId);
        },
        advance: handleAdvance,
        // ARCHITECT: «Назад» внутри теста возвращает к предыдущему вопросу, а на первом — к описанию:
        // ответы остаются, поэтому возврат не стоит повторного прохождения.
        back: () => (currentIndex > 0 ? goPrev() : setPhase("intro")),
        startOrResume: () => (hasProgress ? setPhase("questions") : start(includeListening)),
        toggleListening: setIncludeListening,
        finishListening: finish,
        complete: () => {
            if (savedResult === null) return;
            // ARCHITECT: сессия закрывается на выходе из сводки: вернувшись на шаг позже, пользователь
            // снова увидит итог, а не незаконченный тест.
            reset();
            onComplete(savedResult.overall);
        },
    };
}