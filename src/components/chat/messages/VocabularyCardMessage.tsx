// ARCHITECT: Карточка нового слова — переведена на русский
// Содержит слово, транскрипцию, перевод, примеры и связанные слова

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Bookmark, BookmarkCheck, BookOpen } from 'lucide-react';
import type { VocabularyCard } from '@/types/session';
import { cn } from '@/lib/utils';

interface VocabularyCardMessageProps {
    card?: VocabularyCard;
}

// ARCHITECT: переводы частей речи для отображения
const PART_OF_SPEECH_RU: Record<VocabularyCard['partOfSpeech'], string> = {
    noun: 'существительное',
    verb: 'глагол',
    adjective: 'прилагательное',
    adverb: 'наречие',
    preposition: 'предлог',
};

export function VocabularyCardMessage({ card }: VocabularyCardMessageProps) {
    const [saved, setSaved] = useState(false);
    const [activeExample, setActiveExample] = useState<number>(0);

    if (!card) return null;

    return (
        <div className="flex justify-start">
            <div className="w-full max-w-[92%] overflow-hidden rounded-2xl border border-teal-500/20 bg-teal-500/[0.05] md:max-w-[80%]">
                {/* Шапка */}
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-teal-400" />
                        <span className="text-sm font-medium text-[#f0f0f5]">Новое слово</span>
                    </div>
                    <button
                        onClick={() => setSaved(!saved)}
                        aria-label={saved ? 'Убрать из словаря' : 'Сохранить в словарь'}
                        className={cn(
                            'flex size-7 items-center justify-center rounded-lg transition-colors',
                            saved
                                ? 'bg-teal-500/20 text-teal-400'
                                : 'text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60'
                        )}
                    >
                        {saved ? (
                            <BookmarkCheck className="size-4" />
                        ) : (
                            <Bookmark className="size-4" />
                        )}
                    </button>
                </div>

                <div className="p-4">
                    {/* Слово + произношение */}
                    <div className="mb-3 flex flex-wrap items-baseline gap-3">
                        <h3 className="text-xl font-bold text-[#f0f0f5]">{card.word}</h3>
                        <span className="text-sm text-[#f0f0f5]/40">{card.pronunciation}</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50">
                            {PART_OF_SPEECH_RU[card.partOfSpeech]}
                        </span>
                    </div>

                    {/* Перевод */}
                    <p className="mb-4 text-sm text-[#f0f0f5]/70">{card.translation}</p>

                    {/* Кнопка прослушивания — задел под TTS */}
                    <button className="mb-4 flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/[0.1]">
                        <Volume2 className="size-3.5" />
                        Прослушать
                    </button>

                    {/* Примеры */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">
                            Примеры
                        </p>
                        {card.examples.map((example, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    'cursor-pointer rounded-xl p-3 transition-colors',
                                    activeExample === index
                                        ? 'bg-white/[0.08]'
                                        : 'bg-black/20 hover:bg-white/[0.04]'
                                )}
                                onClick={() => setActiveExample(index)}
                            >
                                <p className="text-sm leading-relaxed text-[#f0f0f5]">
                                    "{example.sentence}"
                                </p>
                                {example.translation && (
                                    <p className="mt-1 text-xs text-[#f0f0f5]/40">
                                        {example.translation}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Связанные слова */}
                    {card.relatedWords && card.relatedWords.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-[#f0f0f5]/30">Похожие:</span>
                            {card.relatedWords.map((word) => (
                                <span
                                    key={word}
                                    className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50"
                                >
                                    {word}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}