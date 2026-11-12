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
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { ListeningTestDialog } from "@/components/placement/ListeningTestDialog";
import { PlacementIntro } from "@/components/placement/PlacementIntro";
import { PlacementQuestion } from "@/components/placement/PlacementQuestion";
import { PlacementResultView } from "@/components/placement/PlacementResult";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";

interface PlacementStepProps {
    onComplete: (level: EnglishLevel) => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

type PlacementPhase = "intro" | "test" | "result";

export function PlacementStep({ onComplete, onBack, step, totalSteps }: PlacementStepProps) {
    const [savedResult, setSavedResult] = useState<PlacementResult | null>(() => getResult());
    const [phase, setPhase] = useState<PlacementPhase>(() => (getResult() ? "result" : "intro"));
    const [state, setState] = useState<PlacementState>(() => createPlacementState());
    const [item, setItem] = useState<PlacementItem | null>(null);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [isListeningOpen, setIsListeningOpen] = useState(false);

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

    const handleAdvance = () => {
        const upcoming = nextItem(state);

        if (upcoming !== null) {
            setItem(upcoming);
            setSelectedOptionId(null);
            return;
        }

        const finished = finalize(state);
        saveResult(finished);
        setSavedResult(finished);
        setPhase("result");
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
            <div className="mx-auto w-full max-w-xl">
                <StepHeader
                    eyebrow={ONBOARDING_STEP_TITLES.assessment}
                    title="Уровень определён"
                    subtitle="Уровень попадёт в сводку перед первым уроком и в профиль."
                    step={step}
                    totalSteps={totalSteps}
                />
                <PlacementResultView
                    result={savedResult}
                    onCheckListening={() => setIsListeningOpen(true)}
                />
                <StepNav
                    onBack={onBack}
                    onNext={() => onComplete(savedResult.overall)}
                    nextLabel="Продолжить"
                />
                <ListeningTestDialog
                    open={isListeningOpen}
                    onOpenChange={setIsListeningOpen}
                    onSaved={() => setSavedResult(getResult())}
                />
            </div>
        );
    }

    if (phase === "test" && item !== null) {
        const questionNumber = askedQuestions(state) + 1;

        return (
            <div className="mx-auto w-full max-w-xl">
                <StepHeader
                    eyebrow={ONBOARDING_STEP_TITLES.assessment}
                    title="Определим твой уровень"
                    step={step}
                    totalSteps={totalSteps}
                />
                <PlacementQuestion
                    item={item}
                    number={questionNumber}
                    total={totalQuestions()}
                    selectedOptionId={selectedOptionId}
                    onSelect={handleAnswer}
                />
                <StepNav
                    onBack={handleBackToIntro}
                    onNext={handleAdvance}
                    nextLabel={
                        questionNumber >= totalQuestions() ? "Показать результат" : "Дальше"
                    }
                    disabled={selectedOptionId === null}
                />
            </div>
        );
    }

    return (
        <PlacementIntro onStart={handleStart} onBack={onBack} step={step} totalSteps={totalSteps} />
    );
}