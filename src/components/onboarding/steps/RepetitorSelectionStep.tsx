// ARCHITECT: Выбор ИИ-репетитора (блобатара)

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOCK_REPETITORS } from '@/api/mocks/repetitors';
import type { RepetitorId } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface RepetitorSelectionStepProps {
    selectedId: RepetitorId | null;
    onSelect: (id: RepetitorId) => void;
    onNext: () => void;
    onBack: () => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function RepetitorSelectionStep({
    selectedId,
    onSelect,
    onNext,
    onBack,
}: RepetitorSelectionStepProps) {
    return (
        <div>
            <div className="mb-10 text-center">
                <h2 className="mb-3 text-3xl font-bold text-[#f0f0f5]">
                    Choose your tutor
                </h2>
                <p className="mx-auto max-w-md text-[#f0f0f5]/50">
                    Each tutor has their own personality and teaching style. Pick the one
                    that feels right for you.
                </p>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                {MOCK_REPETITORS.map((repetitor) => {
                    const isSelected = selectedId === repetitor.id;

                    return (
                        <motion.button
                            key={repetitor.id}
                            variants={cardVariants}
                            onClick={() => onSelect(repetitor.id)}
                            className={cn(
                                'group relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all',
                                isSelected
                                    ? 'border-white/40 bg-white/[0.08]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                            )}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-[#f0f0f5]"
                                >
                                    <Check className="size-3.5 text-black" />
                                </motion.div>
                            )}

                            {/* Avatar placeholder - will be replaced with Blobatar */}
                            <div
                                className="mb-4 flex size-20 items-center justify-center rounded-full"
                                style={{ backgroundColor: `${repetitor.avatarColor}20` }}
                            >
                                <div
                                    className="size-12 rounded-full"
                                    style={{ backgroundColor: repetitor.avatarColor }}
                                />
                            </div>

                            <h3 className="mb-1 text-lg font-semibold text-[#f0f0f5]">
                                {repetitor.name}
                            </h3>

                            <p className="mb-3 text-xs text-[#f0f0f5]/50">
                                {repetitor.personality}
                            </p>

                            <div className="flex flex-wrap justify-center gap-1">
                                {repetitor.specialties.map((spec) => (
                                    <span
                                        key={spec}
                                        className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] capitalize text-[#f0f0f5]/60"
                                    >
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Navigation */}
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
                    disabled={!selectedId}
                    className={cn(
                        'flex items-center gap-2 rounded-full px-8 py-3',
                        selectedId
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