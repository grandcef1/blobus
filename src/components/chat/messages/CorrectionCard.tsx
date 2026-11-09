// ARCHITECT: Карточка грамматической коррекции с подсветкой ошибок

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, BookOpen, Lightbulb } from 'lucide-react';
import type { EnhancedMessage, GrammarCorrection } from '@/types/session';
import { MessageBubble } from './MessageBubble';  // ← ПЕРЕНЕСЁН ВВЕРХ
import { cn } from '@/lib/utils';

interface CorrectionCardProps {
    message: EnhancedMessage;
    correction?: GrammarCorrection;
}

const SEVERITY_STYLES = {
    minor: {
        border: 'border-emerald-500/20',
        bg: 'bg-emerald-500/[0.06]',
        badge: 'bg-emerald-500/15 text-emerald-400',
        label: 'Minor',
    },
    moderate: {
        border: 'border-amber-500/20',
        bg: 'bg-amber-500/[0.06]',
        badge: 'bg-amber-500/15 text-amber-400',
        label: 'Moderate',
    },
    major: {
        border: 'border-rose-500/20',
        bg: 'bg-rose-500/[0.06]',
        badge: 'bg-rose-500/15 text-rose-400',
        label: 'Important',
    },
} as const;

export function CorrectionCard({ message, correction }: CorrectionCardProps) {
    const [showDetails, setShowDetails] = useState(false);

    if (!correction) {
        return <MessageBubble message={message} />;
    }

    const severityStyle = SEVERITY_STYLES[correction.severity];

    return (
        <div className="flex justify-start">
            <div
                className={cn(
                    'w-full max-w-[92%] overflow-hidden rounded-2xl border md:max-w-[80%]',
                    severityStyle.border,
                    severityStyle.bg
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-[#f0f0f5]/60" />
                        <span className="text-sm font-medium text-[#f0f0f5]">
                            Grammar Check
                        </span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                severityStyle.badge
                            )}
                        >
                            {severityStyle.label}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex size-6 items-center justify-center rounded-md text-[#f0f0f5]/40 transition-colors hover:bg-white/[0.08] hover:text-[#f0f0f5]"
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 transition-transform duration-200',
                                showDetails && 'rotate-180'
                            )}
                        />
                    </button>
                </div>

                {/* Original vs Corrected */}
                <div className="space-y-3 px-4 pb-4">
                    {/* Original */}
                    <div className="rounded-xl bg-black/20 p-3">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                            Your message
                        </p>
                        <p className="text-sm leading-relaxed text-[#f0f0f5]/50 line-through decoration-rose-400/40">
                            {correction.originalText}
                        </p>
                    </div>

                    {/* Corrected */}
                    <div className="flex items-start gap-2 rounded-xl bg-black/20 p-3">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <div>
                            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                                Corrected
                            </p>
                            <p
                                className="text-sm leading-relaxed text-[#f0f0f5]"
                                dangerouslySetInnerHTML={{
                                    __html: correction.correctedText.replace(
                                        /\*\*(.*?)\*\*/g,
                                        '<mark class="bg-emerald-400/20 text-emerald-300 rounded px-0.5">$1</mark>'
                                    ),
                                }}
                            />
                        </div>
                    </div>

                    {/* Expandable details */}
                    <motion.div
                        initial={false}
                        animate={{ height: showDetails ? 'auto' : 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        {showDetails && (
                            <div className="space-y-3 pt-2">
                                {/* Explanation */}
                                <div className="flex items-start gap-2 rounded-xl bg-black/20 p-3">
                                    <BookOpen className="mt-0.5 size-4 shrink-0 text-[#f0f0f5]/50" />
                                    <div>
                                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                                            {correction.ruleName}
                                        </p>
                                        <p className="text-sm leading-relaxed text-[#f0f0f5]/70">
                                            {correction.explanation}
                                        </p>
                                    </div>
                                </div>

                                {/* Examples */}
                                {correction.examples.length > 0 && (
                                    <div className="flex items-start gap-2 rounded-xl bg-black/20 p-3">
                                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-400/60" />
                                        <div className="min-w-0">
                                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                                                Examples
                                            </p>
                                            <ul className="space-y-1.5">
                                                {correction.examples.map((example, index) => (
                                                    <li
                                                        key={index}
                                                        className="text-sm leading-relaxed text-[#f0f0f5]/70"
                                                        dangerouslySetInnerHTML={{
                                                            __html: example.replace(
                                                                /\*\*(.*?)\*\*/g,
                                                                '<strong class="text-[#f0f0f5]">$1</strong>'
                                                            ),
                                                        }}
                                                    />
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

