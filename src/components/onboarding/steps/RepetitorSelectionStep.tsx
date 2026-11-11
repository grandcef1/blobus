// ARCHITECT: Выбор репетитора — использует блобатары из общего источника.
// Радиогруппа с keyboard navigation (стрелки, Tab, Enter/Space). Логика не меняется:
// рескин — заголовок через StepHeader, плитки на общих токенах поверхностей, навигация
// через StepNav. Контейнер max-w-3xl: пять плиток дышат и не сжимаются в узкую колонку.

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import type { BlobatarId } from "@/types/blobatar";
import { tileClasses } from "@/lib/surfaces";

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
    const [focusedIndex, setFocusedIndex] = useState(0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const maxIndex = MOCK_BLOBATARS.length - 1;

        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
                e.preventDefault();
                setFocusedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
                break;
            case "ArrowLeft":
            case "ArrowUp":
                e.preventDefault();
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                onSelect(MOCK_BLOBATARS[focusedIndex].id as BlobatarId);
                break;
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl">
            <StepHeader
                eyebrow="Репетитор"
                title="Выбери репетитора"
                subtitle="У каждого свой характер и стиль преподавания"
                step={step}
                totalSteps={totalSteps}
            />

            <div
                role="radiogroup"
                aria-label="Выбор репетитора"
                onKeyDown={handleKeyDown}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5"
            >
                {MOCK_BLOBATARS.map((blobatar, index) => {
                    const isSelected = selectedId === blobatar.id;
                    const isFocused = focusedIndex === index;

                    return (
                        <motion.button
                            key={blobatar.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={blobatar.name}
                            tabIndex={isFocused ? 0 : -1}
                            onClick={() => onSelect(blobatar.id as BlobatarId)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className={tileClasses(
                                isSelected,
                                "group relative flex flex-col items-center p-5"
                            )}
                        >
                            {isSelected && (
                                <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[#f0f0f5]">
                                    <Check
                                        className="size-3 text-black"
                                        strokeWidth={3}
                                        aria-hidden="true"
                                    />
                                </div>
                            )}

                            <div className="mb-3 size-20">
                                <Blobatar
                                    animate="always"
                                    name={blobatar.name.toLowerCase()}
                                    traits={blobatar.traits}
                                />
                            </div>

                            {/* ARCHITECT: имя — span, а не h3: внутри <button> допустим только
                                phrasing content, а заголовок внутри кнопки ничего не сообщает. */}
                            <span className="block text-sm font-medium text-[#f0f0f5]">
                                {blobatar.name}
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            <StepNav onBack={onBack} onNext={onNext} nextLabel="Продолжить" disabled={!selectedId} />
        </div>
    );
}
