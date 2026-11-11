// ARCHITECT: Карточка слова — блобатар слева, имя репетитора

import { useState } from "react";
import { Volume2, Bookmark, BookmarkCheck, BookOpen } from "lucide-react";
import { Blobatar } from "@blobatar/react";
import type { EnhancedChatSession, VocabularyCard } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_REPETITORS } from "@/api/mocks/repetitors";
import { cn } from "@/lib/utils";

interface VocabularyCardMessageProps {
    card?: VocabularyCard;
    session: EnhancedChatSession;
}

const PART_OF_SPEECH_RU: Record<VocabularyCard["partOfSpeech"], string> = {
    noun: "существительное",
    verb: "глагол",
    adjective: "прилагательное",
    adverb: "наречие",
    preposition: "предлог",
};

export function VocabularyCardMessage({ card, session }: VocabularyCardMessageProps) {
    const [saved, setSaved] = useState(false);
    const blobatar = getBlobatarById(session.repetitorId);
    const repetitor = MOCK_REPETITORS.find((r) => r.id === session.repetitorId);

    if (!card) return null;

    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 size-8 shrink-0 rounded-full bg-[#141416] p-0.5">
                {blobatar ? (
                    <Blobatar animate="always" name={blobatar.name.toLowerCase()} traits={blobatar.traits} />
                ) : (
                    <div className="size-full rounded-full bg-white/10" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                {repetitor && <p className="mb-1 text-xs font-medium text-[#f0f0f5]/50">{repetitor.name}</p>}
                <div className="w-full overflow-hidden rounded-2xl rounded-tl-md border border-teal-500/20 bg-teal-500/[0.05] md:max-w-[85%]">
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4 text-teal-400" />
                            <span className="text-sm font-medium text-[#f0f0f5]">Новое слово</span>
                        </div>
                        <button
                            onClick={() => setSaved(!saved)}
                            aria-label={saved ? "Убрать из словаря" : "Сохранить в словарь"}
                            className={cn(
                                "flex size-7 items-center justify-center rounded-lg transition-colors",
                                saved ? "bg-teal-500/20 text-teal-400" : "text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60"
                            )}
                        >
                            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="mb-3 flex flex-wrap items-baseline gap-3">
                            <h3 className="text-xl font-bold text-[#f0f0f5]">{card.word}</h3>
                            <span className="text-sm text-[#f0f0f5]/40">{card.pronunciation}</span>
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50">
                                {PART_OF_SPEECH_RU[card.partOfSpeech]}
                            </span>
                        </div>

                        <p className="mb-4 text-sm text-[#f0f0f5]/70">{card.translation}</p>

                        <button className="mb-4 flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/[0.1]">
                            <Volume2 className="size-3.5" />
                            Прослушать
                        </button>

                        <div className="space-y-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-[#f0f0f5]/30">Примеры</p>
                            {card.examples.map((example, index) => (
                                <div
                                    key={index}
                                    className="rounded-xl bg-black/20 p-3 transition-colors hover:bg-white/[0.04]"
                                >
                                    <p className="text-sm leading-relaxed text-[#f0f0f5]">&ldquo;{example.sentence}&rdquo;</p>
                                    {example.translation && (
                                        <p className="mt-1 text-xs text-[#f0f0f5]/40">{example.translation}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {card.relatedWords && card.relatedWords.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-[#f0f0f5]/30">Похожие:</span>
                                {card.relatedWords.map((word) => (
                                    <span key={word} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50">
                                        {word}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}