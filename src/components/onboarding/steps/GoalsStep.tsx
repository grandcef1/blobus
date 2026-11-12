// ARCHITECT: шаг 3 «Цели» — оркестратор двух фаз: выбор цели и выбор репетитора под неё. Номер
// шага у фаз общий, поэтому мастер остаётся на пяти шагах.
// ARCHITECT: состав репетиторов берётся из рекомендаций выбранного режима: сначала цель, потом
// тот, кто её ведёт, — так выбор читается как следствие, а не как список из десяти карточек.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Blobatar, BlobatarId } from "@/types/blobatar";
import type { LearningMode } from "@/types/onboarding";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import { getPersonaByMode, MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { ModeSelectionStep } from "./ModeSelectionStep";
import { RepetitorSelectionStep } from "./RepetitorSelectionStep";

interface GoalsStepProps {
    selectedMode: LearningMode | null;
    selectedId: BlobatarId | null;
    onSelectMode: (mode: LearningMode) => void;
    onSelectBlobatar: (id: BlobatarId) => void;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

// ARCHITECT: смена фазы внутри шага раньше была переходом мастера, поэтому короткий fade смены
// состояния ставится здесь: переход цель → репетитор не должен быть мгновенным.
const PHASE_MOTION = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: "easeOut" as const },
};

type GoalsPhase = "mode" | "repetitor";

export function GoalsStep({
    selectedMode,
    selectedId,
    onSelectMode,
    onSelectBlobatar,
    onNext,
    onBack,
    step,
    totalSteps,
}: GoalsStepProps) {
    // ARCHITECT: возврат на шаг с уже выбранной целью сразу открывает выбор репетитора: проходить
    // один и тот же выбор дважды незачем.
    const [phase, setPhase] = useState<GoalsPhase>(selectedMode === null ? "mode" : "repetitor");

    const roster: Blobatar[] = useMemo(
        () => (selectedMode === null ? MOCK_BLOBATARS : getPersonaByMode(selectedMode)),
        [selectedMode]
    );

    if (phase === "mode") {
        return (
            <motion.div key="mode" {...PHASE_MOTION}>
                <ModeSelectionStep
                    selectedMode={selectedMode}
                    onSelect={onSelectMode}
                    onNext={() => setPhase("repetitor")}
                    onBack={onBack}
                    step={step}
                    totalSteps={totalSteps}
                />
            </motion.div>
        );
    }

    return (
        <motion.div key="repetitor" {...PHASE_MOTION}>
            <RepetitorSelectionStep
                roster={roster}
                eyebrow={ONBOARDING_STEP_TITLES.goals}
                selectedId={selectedId}
                onSelect={onSelectBlobatar}
                onNext={onNext}
                onBack={() => setPhase("mode")}
                step={step}
                totalSteps={totalSteps}
            />
        </motion.div>
    );
}