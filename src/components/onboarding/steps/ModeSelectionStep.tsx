// ARCHITECT: Выбор цели обучения. Логика не меняется: рескин — заголовок через
// StepHeader, плитки на общих токенах поверхностей, навигация через StepNav.
// Сетка опций и порядок иконок остались прежними.

import { motion } from "framer-motion";
import { Check, Briefcase, MessageCircle, BookOpen, Globe } from "lucide-react";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import type { LearningMode } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import { tileClasses } from "@/lib/surfaces";

interface ModeSelectionStepProps {
    selectedMode: LearningMode | null;
    onSelect: (mode: LearningMode) => void;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

const MODE_ICONS: Record<LearningMode, typeof Briefcase> = {
    interview: Briefcase,
    speaking: MessageCircle,
    grammar: BookOpen,
    general: Globe,
};

export function ModeSelectionStep({
    selectedMode,
    onSelect,
    onNext,
    onBack,
    step,
    totalSteps,
}: ModeSelectionStepProps) {
    return (
        <div>
            <StepHeader
                eyebrow="Цель"
                title="На чём хочешь сосредоточиться?"
                subtitle="Ты всегда можешь переключиться или добавить другие режимы позже. Давай начнём с твоей главной цели."
                step={step}
                totalSteps={totalSteps}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MOCK_LEARNING_MODES.map((mode, index) => {
                    const modeId = mode.id as LearningMode;
                    const Icon = MODE_ICONS[modeId];
                    const isSelected = selectedMode === modeId;

                    return (
                        <motion.button
                            key={mode.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onSelect(modeId)}
                            className={tileClasses(
                                isSelected,
                                "relative flex items-start gap-4 p-6 text-left"
                            )}
                        >
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-[#f0f0f5]"
                                >
                                    <Check className="size-3.5 text-black" />
                                </motion.div>
                            )}

                            <div
                                className={cn(
                                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                                    isSelected ? "bg-[#f0f0f5]/20" : "bg-white/[0.06]"
                                )}
                            >
                                <Icon className="size-6 text-[#f0f0f5]" />
                            </div>

                            <div>
                                <h3 className="mb-1 text-lg font-semibold text-[#f0f0f5]">
                                    {mode.label}
                                </h3>
                                <p className="text-sm leading-relaxed text-[#f0f0f5]/50">
                                    {mode.description}
                                </p>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <StepNav onBack={onBack} onNext={onNext} nextLabel="Продолжить" disabled={!selectedMode} className="mt-10" />
        </div>
    );
}