// ARCHITECT: карточка нового слова — та же монохромная поверхность, что у правки и викторины: в
// ленте цвет остаётся только у значимого состояния (верный ответ, изменённое слово), поэтому
// прежняя бирюзовая плашка убрана.
// ARCHITECT: блоки примеров больше не «карточки в карточке»: список идёт под тонкой линией, иначе
// рамка внутри рамки читалась как два разных блока.

import { useState } from "react";
import { Bookmark, BookmarkCheck, Volume2 } from "lucide-react";
import type { EnhancedChatSession, VocabularyCard } from "@/types/session";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
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

const AUTHOR_NAME = "mb-1 text-xs font-medium text-[#f0f0f5]/60";
const EYEBROW = "text-[11px] uppercase tracking-wider text-[#f0f0f5]/30";

export function VocabularyCardMessage({ card, session }: VocabularyCardMessageProps) {
    const [saved, setSaved] = useState(false);
    const repetitor = getBlobatarById(session.repetitorId);

    if (!card) return null;

    return (
        <div className="flex items-start gap-3">
            <BlobatarAvatar id={session.repetitorId} className="mt-0.5 size-8 p-0.5" />
            <div className="min-w-0 flex-1">
                {repetitor && <p className={AUTHOR_NAME}>{repetitor.name}</p>}

                <div className="w-full rounded-xl border border-white/5 bg-white/[0.02] p-4 md:max-w-[min(85%,70ch)]">
                    <div className="flex items-start justify-between gap-3">
                        <p className={EYEBROW}>Новое слово</p>
                        <button
                            type="button"
                            onClick={() => setSaved(!saved)}
                            aria-label={saved ? "Убрать из словаря" : "Сохранить в словарь"}
                            className={cn(
                                "flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]",
                                saved
                                    ? "text-[#f0f0f5]"
                                    : "text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60"
                            )}
                        >
                            {saved ? (
                                <BookmarkCheck className="size-4" aria-hidden="true" />
                            ) : (
                                <Bookmark className="size-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="text-xl font-semibold text-[#f0f0f5]">{card.word}</h3>
                        <span className="text-sm text-[#f0f0f5]/50">{card.pronunciation}</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#f0f0f5]/50">
                            {PART_OF_SPEECH_RU[card.partOfSpeech]}
                        </span>
                    </div>

                    <p className="mt-2 text-sm leading-[1.6] text-[#f0f0f5]/70">{card.translation}</p>

                    <button
                        type="button"
                        className="mt-3 flex min-h-11 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/10 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                    >
                        <Volume2 className="size-3.5" aria-hidden="true" />
                        Прослушать
                    </button>

                    <div className="mt-4 border-t border-white/5 pt-3">
                        <p className={EYEBROW}>Примеры</p>
                        <ul className="mt-2 flex flex-col gap-2">
                            {card.examples.map((example, index) => (
                                <li key={index} className="text-sm leading-[1.6] text-[#f0f0f5]/80">
                                    {example.sentence}
                                    {example.translation && (
                                        <span className="block text-xs text-[#f0f0f5]/40">
                                            {example.translation}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

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