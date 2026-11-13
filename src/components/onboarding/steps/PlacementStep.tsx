// ARCHITECT: шаг «Тест» мастера — оркестратор фаз: интро, вопросы, аудирование, сводка. Логика подачи
// живёт в lib/placement и ничего не знает про React, поэтому здесь остаются только переходы между
// фазами.
// ARCHITECT: состояние сессии теста (фаза, ответы, адаптивные дорожки, номер вопроса) лежит в сторе:
// мастер перемонтирует шаг при переходах между шагами, и локальное состояние уносило бы с собой все
// ответы.
// ARCHITECT: пройденный тест не предлагается заново: сохранённый результат открывает шаг сразу на
// экране итога, иначе возврат назад по мастеру обнулял бы уже определённый уровень.

import { useState } from "react";
import { getResult, saveResult } from "@/api/placement";
import { finalize, findPlacementItem, totalQuestions } from "@/lib/placement";
import { usePlacementSession } from "@/store/placement";
import type { PlacementPhase } from "@/store/placement";
import type { PlacementResult } from "@/types/placement";
import type { EnglishLevel } from "@/types/onboarding";
import { PlacementIntro } from "@/components/placement/PlacementIntro";
import { PlacementListeningPhase } from "@/components/placement/PlacementListeningPhase";
import { PlacementResultPhase } from "@/components/placement/PlacementResultPhase";
import { PlacementTestPhase } from "@/components/placement/PlacementTestPhase";

interface PlacementStepProps {
    onComplete: (level: EnglishLevel) => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

export function PlacementStep({ onComplete, onBack, step, totalSteps }: PlacementStepProps) {
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
    // ARCHITECT: незаконченная сессия важнее сохранённого результата: она и есть текущий прогресс,
    // поэтому возврат на шаг продолжает тест, а не показывает чужой итог.
    const isTestInProgress = askedItemIds.length > 0 && sessionPhase !== "result";
    const phase: PlacementPhase = isTestInProgress || savedResult === null ? sessionPhase : "result";

    const currentItemId = askedItemIds[currentIndex] ?? null;
    const currentItem = currentItemId === null ? null : findPlacementItem(currentItemId);
    const questionNumber = currentIndex + 1;
    const selectedOptionId = currentItemId === null ? null : (answers[currentItemId] ?? null);
    // ARCHITECT: номер вопроса и граница последнего считаются от одного индекса, поэтому подпись
    // кнопки переключается ровно на двадцатом вопросе, а не после ответа на девятнадцатый.
    const isLastQuestion = questionNumber === total;

    const handleAnswer = (optionId: string) => {
        if (currentItem === null || selectedOptionId !== null) return;
        answer(currentItem.id, optionId);
    };

    // ARCHITECT: результат собирается один раз после последнего вопроса: аудирование может идти сразу
    // за тестом, поэтому его уровень приходит аргументом, а не дозаписывается позже.
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

        if (includeListening) {
            setPhase("listening");
            return;
        }

        finish(null);
    };

    // ARCHITECT: «Назад» внутри теста возвращает к предыдущему вопросу, а на первом — к описанию:
    // ответы остаются, поэтому возврат не стоит повторного прохождения.
    const handleBack = () => {
        if (currentIndex > 0) {
            goPrev();
            return;
        }

        setPhase("intro");
    };

    if (phase === "result" && savedResult !== null) {
        return (
            <PlacementResultPhase
                result={savedResult}
                step={step}
                totalSteps={totalSteps}
                onBack={onBack}
                // ARCHITECT: сессия закрывается на выходе из сводки: вернувшись на шаг позже,
                // пользователь снова увидит итог, а не незаконченный тест.
                onContinue={() => {
                    reset();
                    onComplete(savedResult.overall);
                }}
            />
        );
    }

    // ARCHITECT: аудирование идёт сразу после основных вопросов, если его включили в описании
    // теста: результат собирается один — с уровнем аудирования внутри.
    if (phase === "listening") {
        return (
            <PlacementListeningPhase step={step} totalSteps={totalSteps} onComplete={(level) => finish(level)} />
        );
    }

    if (phase === "questions" && currentItem !== null) {
        return (
            <PlacementTestPhase
                item={currentItem}
                number={questionNumber}
                total={total}
                selectedOptionId={selectedOptionId}
                withListening={includeListening}
                onSelect={handleAnswer}
                onBack={handleBack}
                onNext={handleAdvance}
                step={step}
                totalSteps={totalSteps}
            />
        );
    }

    // ARCHITECT: незаконченный тест продолжается с того же вопроса, а не начинается заново: кнопка
    // описания возвращает к нему, и только старт с нуля действительно обнуляет сессию.
    const hasProgress = askedItemIds.length > 0;

    return (
        <PlacementIntro
            withListening={includeListening}
            hasProgress={hasProgress}
            onToggleListening={setIncludeListening}
            onStart={() => (hasProgress ? setPhase("questions") : start(includeListening))}
            onBack={onBack}
            step={step}
            totalSteps={totalSteps}
        />
    );
}