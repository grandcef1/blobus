// ARCHITECT: Выбор режима обучения

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Briefcase, MessageCircle, BookOpen, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOCK_LEARNING_MODES } from '@/api/mocks/repetitors';
import type { LearningMode } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface ModeSelectionStepProps {
    selectedMode: LearningMode | null;
    onSelect: (mode: LearningMode) => void;
    onNext: () => void;
    onBack: () => void;
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
}: ModeSelectionStepProps) {
    return (
        <div>
            <div className="mb-10 text-center">
                <h2 className="mb-3 text-3xl font-bold text-[#f0f0f5]">
                    What would you like to focus on?
                </h2>
                <p className="mx-auto max-w-md text-[#f0f0f5]/50">
                    You can always switch or add more modes later. Let's start with your
                    main goal.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MOCK_LEARNING_MODES.map((mode, index) => {
                    const Icon = MODE_ICONS[mode.id];
                    const isSelected = selectedMode === mode.id;

                    return (
                        <motion.button
                            key={mode.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onSelect(mode.id)}
                            className={cn(
                                'relative flex items-start gap-4 rounded-2xl border p-6 text-left transition-all',
                                isSelected
                                    ? 'border-white/40 bg-white/[0.08]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
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
                                    'flex size-12 shrink-0 items-center justify-center rounded-xl',
                                    isSelected ? 'bg-[#f0f0f5]/20' : 'bg-white/[0.06]'
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

            <div className="mt-10 flex items-center justify-between">
                <Button
                    onClick={onBack}
                    variant="ghost"
                    className="flex items-center gap-2 text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                >
                    <ArrowLeft className="size-4" />
                    Back
                </Button>

                <Button
                    onClick={onNext}
                    disabled={!selectedMode}
                    className={cn(
                        'flex items-center gap-2 rounded-full px-8 py-3',
                        selectedMode
                            ? 'bg-[#f0f0f5] text-black hover:scale-[1.02]'
                            : 'bg-white/10 text-[#f0f0f5]/30 cursor-not-allowed'
                    )}
                >
                    Continue
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}