// ARCHITECT: фаза итога теста — заголовок, сводка, вход в аудирование и переход дальше. Вынесена из
// шага: он стал оркестратором четырёх фаз и упёрся в лимит строк на компонент.
// ARCHITECT: диалог аудирования живёт здесь, рядом с кнопкой «Проверить аудирование»: точка входа
// одна, а свежий результат возвращается наверх через onResultChange.

import { useState } from "react";
import { getResult } from "@/api/placement";
import type { PlacementResult } from "@/types/placement";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { ListeningTestDialog } from "@/components/placement/ListeningTestDialog";
import { PlacementResultView } from "@/components/placement/PlacementResult";

interface PlacementResultPhaseProps {
    result: PlacementResult;
    step: number;
    totalSteps: number;
    onBack: () => void;
    onContinue: () => void;
    onResultChange: (result: PlacementResult) => void;
}

export function PlacementResultPhase({
    result,
    step,
    totalSteps,
    onBack,
    onContinue,
    onResultChange,
}: PlacementResultPhaseProps) {
    const [isListeningOpen, setIsListeningOpen] = useState(false);

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.assessment}
                title="Уровень определён"
                subtitle="Уровень попадёт в сводку перед первым уроком и в профиль."
                step={step}
                totalSteps={totalSteps}
            />

            <PlacementResultView result={result} onCheckListening={() => setIsListeningOpen(true)} />

            <StepNav onBack={onBack} onNext={onContinue} nextLabel="Продолжить" />

            <ListeningTestDialog
                open={isListeningOpen}
                onOpenChange={setIsListeningOpen}
                onSaved={() => onResultChange(getResult() ?? result)}
            />
        </div>
    );
}