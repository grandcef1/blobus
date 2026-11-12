// ARCHITECT: оркестратор шага. Выбранный персонаж приходит из мастера, открытая история живёт
// в useRepetitorHistory, поэтому она одна на весь шаг. Правой панели выбранного больше нет:
// панель истории — такой же ребёнок сетки, как карточки, и вставляется на всю ширину под ряд
// источника, поэтому высота карточек не меняется, а строки ниже плавно съезжают.

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { RepetitorCard } from "@/components/onboarding/RepetitorCard";
import { RepetitorHistoryPanel } from "@/components/onboarding/RepetitorHistoryPanel";
import { SelectionStatusLine } from "@/components/onboarding/SelectionStatusLine";
import { MOCK_BLOBATARS, getBlobatarById } from "@/api/mocks/blobatars";
import { useRepetitorHistory } from "@/hooks/useRepetitorHistory";
import { useRovingRadiogroup } from "@/hooks/useRovingRadiogroup";
import type { BlobatarId } from "@/types/blobatar";

// ARCHITECT: порядок обхода один и тот же у шага, у карточек и у клавиатурной модели.
const ROSTER_IDS: BlobatarId[] = MOCK_BLOBATARS.map((item) => item.id);

interface RepetitorSelectionStepProps {
    selectedId: BlobatarId | null;
    onSelect: (id: BlobatarId) => void;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

export function RepetitorSelectionStep({
    selectedId,
    onSelect,
    onNext,
    onBack,
    step,
    totalSteps,
}: RepetitorSelectionStepProps) {
    const shouldReduceMotion = useReducedMotion();
    const selectedBlobatar = selectedId === null ? null : getBlobatarById(selectedId) ?? null;

    const { focusedIndex, setFocusedIndex, handleKeyDown, registerRadio } = useRovingRadiogroup({
        ids: ROSTER_IDS,
        initialIndex: Math.max(selectedId === null ? -1 : ROSTER_IDS.indexOf(selectedId), 0),
        onSelect,
    });

    const {
        isPanelOpen,
        openBlobatar,
        rowEnd,
        columns,
        columnIndex,
        panelElementRef,
        registerHistoryButton,
        handleToggleHistory,
        handleClose,
        handleExitComplete,
        handleStepKeyDown,
    } = useRepetitorHistory({ ids: ROSTER_IDS, selectedId });

    const gridItems: ReactNode[] = [];

    MOCK_BLOBATARS.forEach((blobatar, index) => {
        gridItems.push(
            <RepetitorCard
                key={blobatar.id}
                blobatar={blobatar}
                index={index}
                isSelected={selectedId === blobatar.id}
                isHistoryOpen={isPanelOpen && openBlobatar?.id === blobatar.id}
                isFocused={focusedIndex === index}
                onSelect={onSelect}
                onToggleHistory={handleToggleHistory}
                onFocus={setFocusedIndex}
                registerRadio={registerRadio}
                registerHistoryButton={registerHistoryButton}
            />
        );

        // ARCHITECT: панель вставляется после последней карточки своего ряда и остаётся прямым
        // ребёнком сетки: тогда React переносит её узел, а не пересоздаёт, и переезд между
        // рядами анимируется через layout.
        if (index + 1 === rowEnd) {
            gridItems.push(
                <AnimatePresence key="history" initial={false} onExitComplete={handleExitComplete}>
                    {isPanelOpen && openBlobatar !== null ? (
                        <motion.div
                            key="history-slot"
                            layout={!shouldReduceMotion}
                            className="col-span-full"
                        >
                            <RepetitorHistoryPanel
                                blobatar={openBlobatar}
                                columns={columns}
                                columnIndex={columnIndex}
                                onClose={handleClose}
                                panelRef={panelElementRef}
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            );
        }
    });

    return (
        <div className="w-full" onKeyDown={handleStepKeyDown}>
            <StepHeader
                eyebrow="Репетитор"
                title="Выбери репетитора"
                subtitle="У каждого свой характер и стиль преподавания"
                step={step}
                totalSteps={totalSteps}
                align="left"
            />

            {MOCK_BLOBATARS.length === 0 ? (
                <p className="text-sm text-[#f0f0f5]/60">Список репетиторов недоступен</p>
            ) : (
                /* ARCHITECT: radiogroup остаётся на сетке, поэтому панель истории формально
                   оказывается внутри группы. Это цена вставки панели под ряд: вынести её за
                   пределы группы нельзя, не потеряв строку вставки. */
                <div
                    role="radiogroup"
                    aria-label="Выбор репетитора"
                    onKeyDown={handleKeyDown}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {gridItems}
                </div>
            )}

            <SelectionStatusLine blobatar={selectedBlobatar} />

            <StepNav onBack={onBack} onNext={onNext} nextLabel="Продолжить" disabled={!selectedId} />
        </div>
    );
}

