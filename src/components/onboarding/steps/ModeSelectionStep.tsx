// ARCHITECT: Выбор цели обучения. Логика не меняется: заголовок через StepHeader,
// плитки на общих токенах поверхностей, навигация через StepNav.
// Контейнер max-w-3xl и паддинг p-5: четыре плитки читаются как осознанный выбор,
// а не как сжатая форма. Иконка в плитке — на стеклянных токенах surfaces.

import { motion } from "framer-motion";
import { Check, Briefcase, MessageCircle, BookOpen, Globe } from "lucide-react";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";
import type { LearningMode } from "@/types/onboarding";
import { cn } from "@/lib/utils";
import { SELECTED_FILL, tileClasses } from "@/lib/surfaces";

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
        <div className="mx-auto w-full max-w-3xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.goals}
                title="На чём хочешь сосредоточиться?"
                subtitle="Режимы можно добавить и сменить позже. Для начала выбери главную цель."
                step={step}
                totalSteps={totalSteps}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {MOCK_LEARNING_MODES.map((mode, index) => {
                    const modeId = mode.id as LearningMode;
                    const Icon = MODE_ICONS[modeId];
                    const isSelected = selectedMode === modeId;

                    return (
                        <motion.button
                            key={mode.id}
                            type="button"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onSelect(modeId)}
                            className={tileClasses(
                                isSelected,
                                "relative flex h-full items-start gap-4 p-5 text-left"
                            )}
                        >
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[#f0f0f5]"
                                >
                                    <Check
                                        className="size-3 text-black"
                                        strokeWidth={3}
                                        aria-hidden="true"
                                    />
                                </motion.div>
                            )}

                            <div
                                className={cn(
                                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                                    isSelected ? SELECTED_FILL : "bg-white/5"
                                )}
                            >
                                <Icon className="size-6 text-[#f0f0f5]" aria-hidden="true" />
                            </div>

                            {/* ARCHITECT: label и description — span, а не h3/p: внутри <button>
                                допустим только phrasing content. */}
                            <span className="min-w-0">
                                <span className="mb-1 block text-lg font-semibold text-[#f0f0f5]">
                                    {mode.label}
                                </span>
                                <span className="block text-sm leading-relaxed text-[#f0f0f5]/50 line-clamp-2">
                                    {mode.description}
                                </span>
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            <StepNav onBack={onBack} onNext={onNext} nextLabel="Продолжить" disabled={!selectedMode} />
        </div>
    );
}
