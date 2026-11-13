// ARCHITECT: шаг «Тест» мастера — оркестратор фаз: интро, вопросы, результат. Логика подачи живёт
// в lib/placement и ничего не знает про React, поэтому здесь остаются только состояние экрана и
// переходы между фазами.
// ARCHITECT: пройденный тест не предлагается заново: сохранённый результат открывает шаг сразу на
// экране итога, иначе возврат назад по мастеру обнулял бы уже определённый уровень.

import { useState } from "react";
import { getResult, saveResult } from "@/api/placement";
import {
    applyAnswer,
    askedQuestions,
    createPlacementState,
    finalize,
    nextItem,
    totalQuestions,
} from "@/lib/placement";
import type { PlacementState } from "@/lib/placement";
import type { PlacementItem, PlacementResult } from "@/types/placement";
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

type PlacementPhase = "intro" | "test" | "listening" | "result";

export function PlacementStep({ onComplete, onBack, step, totalSteps }: PlacementStepProps) {
    const [savedResult, setSavedResult] = useState<PlacementResult | null>(() => getResult());
    const [phase, setPhase] = useState<PlacementPhase>(() => (getResult() ? "result" : "intro"));
    const [state, setState] = useState<PlacementState>(() => createPlacementState());
    const [item, setItem] = useState<PlacementItem | null>(null);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [withListening, setWithListening] = useState(false);

    const handleStart = () => {
        const fresh = createPlacementState();
        setState(fresh);
        setItem(nextItem(fresh));
        setSelectedOptionId(null);
        setPhase("test");
    };

    const handleAnswer = (optionId: string) => {
        if (item === null || selectedOptionId !== null) return;
        setSelectedOptionId(optionId);
        setState((previous) => applyAnswer(previous, item.id, optionId));
    };

    // ARCHITECT: результат собирается один раз после последнего вопроса: аудирование может идти
    // сразу за тестом, поэтому его уровень приходит аргументом, а не дозаписывается позже.
    const finish = (listening: EnglishLevel | null) => {
        const finished = finalize(state, listening);
        saveResult(finished);
        setSavedResult(finished);
        setPhase("result");
    };

    const handleAdvance = () => {
        const upcoming = nextItem(state);

        if (upcoming !== null) {
            setItem(upcoming);
            setSelectedOptionId(null);
            return;
        }

        if (withListening) {
            setPhase("listening");
            return;
        }

        finish(null);
    };

    // ARCHITECT: «Назад» внутри теста возвращает к описанию теста, а не на предыдущий шаг мастера:
    // уходить из незаконченного теста в «Знакомство» было бы потерей контекста.
    const handleBackToIntro = () => {
        setItem(null);
        setSelectedOptionId(null);
        setPhase("intro");
    };

    if (phase === "result" && savedResult !== null) {
        return (
            <PlacementResultPhase
                result={savedResult}
                step={step}
                totalSteps={totalSteps}
                onBack={onBack}
                onContinue={() => onComplete(savedResult.overall)}
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

    if (phase === "test" && item !== null) {
        return (
            <PlacementTestPhase
                item={item}
                number={askedQuestions(state) + 1}
                total={totalQuestions()}
                selectedOptionId={selectedOptionId}
                withListening={withListening}
                onSelect={handleAnswer}
                onBack={handleBackToIntro}
                onNext={handleAdvance}
                step={step}
                totalSteps={totalSteps}
            />
        );
    }

    return (
        <PlacementIntro
            withListening={withListening}
            onToggleListening={setWithListening}
            onStart={handleStart}
            onBack={onBack}
            step={step}
            totalSteps={totalSteps}
        />
    );
}