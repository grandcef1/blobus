import { useState } from "react";
import { motion } from "framer-motion";
import { Search, RotateCcw, Volume2 } from "lucide-react";
import { fetchVocabulary } from "@/api/progress";
import { useMockQuery } from "@/hooks/useMockQuery";
import { VocabularySkeleton } from "@/components/dashboard/skeletons/VocabularySkeleton";

export function VocabularyPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: words, isLoading } = useMockQuery(fetchVocabulary);

    if (isLoading || words === null) return <VocabularySkeleton />;

    const filteredWords = words.filter(
        (word) =>
            word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
            word.translation.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-4xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5 flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-xl font-semibold text-[#f0f0f5]">Словарь</h1>
                        <p className="mt-1 text-sm text-[#f0f0f5]/50">
                            {words.length} слов в коллекции
                        </p>
                    </div>
                    <button className="flex items-center gap-2 rounded-xl bg-[#f0f0f5] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90">
                        <RotateCcw className="size-4" />
                        Повторить
                    </button>
                </motion.header>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск слова или перевода"
                        className="w-full rounded-xl bg-[#141416] py-2.5 pl-10 pr-4 text-sm text-[#f0f0f5] placeholder:text-[#f0f0f5]/30 focus:outline-none focus:ring-2 focus:ring-[#f0f0f5]/20"
                    />
                </div>

                {filteredWords.length === 0 ? (
                    <div className="rounded-2xl bg-[#111113] p-8 text-center">
                        <p className="text-sm text-[#f0f0f5]/40">Ничего не найдено</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredWords.map((word, index) => (
                            <motion.div
                                key={word.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                                className="rounded-xl bg-[#141416] p-4 transition-colors hover:bg-[#1a1a1c]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <h3 className="truncate text-base font-medium text-[#f0f0f5]">
                                                {word.word}
                                            </h3>
                                            <button
                                                aria-label={`Произнести ${word.word}`}
                                                className="shrink-0 text-[#f0f0f5]/30 transition-colors hover:text-[#f0f0f5]/60"
                                            >
                                                <Volume2 className="size-3.5" />
                                            </button>
                                        </div>
                                        <p className="mt-0.5 truncate text-sm text-[#f0f0f5]/60">{word.translation}</p>
                                        <p className="mt-1 truncate text-xs text-[#f0f0f5]/30">{word.pronunciation}</p>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-xs tabular-nums text-[#f0f0f5]/40">
                                            {word.mastery}%
                                        </span>
                                        <div className="h-1 w-16 overflow-hidden rounded-full bg-[#1a1a1c]">
                                            <div
                                                className="h-full rounded-full bg-[#f0f0f5]/60"
                                                style={{ width: `${word.mastery}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {word.examples.length > 0 && (
                                    <div className="mt-3 border-t border-white/5 pt-3">
                                        <p className="text-xs italic text-[#f0f0f5]/50">
                                            {word.examples[0].sentence}
                                        </p>
                                        <p className="mt-0.5 text-xs text-[#f0f0f5]/30">
                                            {word.examples[0].translation}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}