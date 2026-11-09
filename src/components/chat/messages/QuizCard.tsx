// ARCHITECT: Интерактивная карточка квиза — переведена на русский
// Состояния: выбор → результат → объяснение → повтор

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Check, X, RotateCcw } from 'lucide-react';
import type { QuizContent, QuizOption } from '@/types/session';
import { cn } from '@/lib/utils';

interface QuizCardProps {
    quiz?: QuizContent;
}

export function QuizCard({ quiz }: QuizCardProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);

    if (!quiz) return null;

    const handleSelect = (option: QuizOption) => {
        if (showResult) return;
        setSelectedOption(option.id);
        setShowResult(true);
    };

    const handleRetry = () => {
        setSelectedOption(null);
        setShowResult(false);
    };

    const getOptionStyle = (option: QuizOption) => {
        if (!showResult) {
            return 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]';
        }

        if (option.isCorrect) {
            return 'border-emerald-500/40 bg-emerald-500/10';
        }

        if (selectedOption === option.id && !option.isCorrect) {
            return 'border-rose-500/40 bg-rose-500/10';
        }

        return 'border-white/5 bg-white/[0.02] opacity-50';
    };

    return (
        <div className="flex justify-start">
            <div className="w-full max-w-[92%] overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] md:max-w-[80%]">
                {/* Шапка */}
                <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                    <HelpCircle className="size-4 text-indigo-400" />
                    <span className="text-sm font-medium text-[#f0f0f5]">Викторина</span>
                    {quiz.timeLimit && (
                        <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50">
                            {quiz.timeLimit} сек
                        </span>
                    )}
                </div>

                <div className="p-4">
                    {/* Вопрос */}
                    <p className="mb-4 text-sm font-medium leading-relaxed text-[#f0f0f5]">
                        {quiz.question}
                    </p>

                    {/* Варианты ответа */}
                    <div className="space-y-2">
                        {quiz.options.map((option, index) => (
                            <motion.button
                                key={option.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08 }}
                                onClick={() => handleSelect(option)}
                                disabled={showResult}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                                    getOptionStyle(option)
                                )}
                            >
                                {/* Буква варианта */}
                                <span
                                    className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                        showResult && option.isCorrect
                                            ? 'bg-emerald-500 text-black'
                                            : showResult && selectedOption === option.id && !option.isCorrect
                                                ? 'bg-rose-500 text-black'
                                                : 'bg-white/10 text-[#f0f0f5]/60'
                                    )}
                                >
                                    {['А', 'Б', 'В', 'Г'][index] ?? option.text.charAt(0).toUpperCase()}
                                </span>

                                <span className="flex-1 text-sm text-[#f0f0f5]">
                                    {option.text}
                                </span>

                                {/* Иконка результата */}
                                <AnimatePresence>
                                    {showResult && option.isCorrect && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <Check className="size-4 text-emerald-400" />
                                        </motion.span>
                                    )}
                                    {showResult && selectedOption === option.id && !option.isCorrect && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <X className="size-4 text-rose-400" />
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        ))}
                    </div>

                    {/* Объяснение после ответа */}
                    <AnimatePresence>
                        {showResult && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 rounded-xl bg-black/20 p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-[#f0f0f5]/60">
                                            {quiz.options.find((o) => o.id === selectedOption)?.explanation ??
                                                quiz.options.find((o) => o.isCorrect)?.explanation}
                                        </p>
                                        <button
                                            onClick={handleRetry}
                                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#f0f0f5]/50 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]"
                                        >
                                            <RotateCcw className="size-3" />
                                            Заново
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}