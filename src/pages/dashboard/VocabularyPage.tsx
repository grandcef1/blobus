import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, RotateCcw, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VocabularySkeleton } from "@/components/dashboard/skeletons/VocabularySkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useVocabulary } from "@/hooks/useVocabulary";
import type { VocabularyEntryDto } from "@/api/progress";
import type { VocabularyWord } from "@/types/progress";
import { VocabularyEntryCard } from "./VocabularyEntryCard";

// ARCHITECT: ветки не смешиваются: мок отдаёт слова с озвучкой и mastery, real — записи схемы.
// Общими остаются шапка, поиск и состояния, поэтому список и счёт берутся из своего массива.

export function VocabularyPage() {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const [searchQuery, setSearchQuery] = useState("");
    const result = useVocabulary();

    // ARCHITECT: null-поле в поиске — пустая строка, иначе отсутствующее значение совпадало бы с запросом.
    const isMock = result.kind === "mock";
    const words: VocabularyWord[] = isMock ? result.words : [];
    const entries: VocabularyEntryDto[] = isMock ? [] : result.entries;
    const query = searchQuery.toLowerCase();
    const matches = (field: string | null): boolean => (field ?? "").toLowerCase().includes(query);
    const filteredWords = words.filter((word) => matches(word.word) || matches(word.translation));
    const filteredEntries = entries.filter(
        (entry) => matches(entry.term) || matches(entry.translation)
    );

    if (result.isLoading) return <VocabularySkeleton />;

    if (result.isError) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
                <ErrorState
                    className="mx-auto max-w-4xl"
                    title={tCommon("states.error.title")}
                    description={tCommon("states.error.description")}
                    retryLabel={tCommon("states.error.reload")}
                    onRetry={() => void result.refetch()}
                />
            </div>
        );
    }

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
                        <h1 className="text-xl font-semibold text-[#f0f0f5]">
                            {t("vocabulary.title")}
                        </h1>
                        <p className="mt-1 text-sm text-[#f0f0f5]/50">
                            {t("vocabulary.count", { total: words.length + entries.length })}
                        </p>
                    </div>
                    {/* ARCHITECT: повторение ещё не подключено: в real-режиме мёртвая кнопка не нужна. */}
                    {isMock && (
                        <button className="flex items-center gap-2 rounded-xl bg-[#f0f0f5] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90">
                            <RotateCcw className="size-4" />
                            {t("vocabulary.review")}
                        </button>
                    )}
                </motion.header>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f0f0f5]/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("vocabulary.searchPlaceholder")}
                        className="w-full rounded-xl bg-[#141416] py-2.5 pl-10 pr-4 text-sm text-[#f0f0f5] placeholder:text-[#f0f0f5]/30 focus:outline-none focus:ring-2 focus:ring-[#f0f0f5]/20"
                    />
                </div>

                {words.length + entries.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title={tCommon("states.empty.vocabulary.title")}
                        description={tCommon("states.empty.vocabulary.description")}
                    />
                ) : filteredWords.length + filteredEntries.length === 0 ? (
                    /* ARCHITECT: пустой словарь и отсутствие совпадений — разные состояния: первое
                       лечится добавлением слов, второе — сбросом запроса, поэтому и тексты разные. */
                    <p className="rounded-2xl bg-[#111113] p-5 text-sm text-[#f0f0f5]/60">
                        {tCommon("states.search.empty")}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {isMock
                            ? filteredWords.map((word, index) => (
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
                                                      aria-label={t("vocabulary.pronounce", {
                                                          word: word.word,
                                                      })}
                                                      className="shrink-0 text-[#f0f0f5]/30 transition-colors hover:text-[#f0f0f5]/60"
                                                  >
                                                      <Volume2 className="size-3.5" />
                                                  </button>
                                              </div>
                                              <p className="mt-0.5 truncate text-sm text-[#f0f0f5]/60">
                                                  {word.translation}
                                              </p>
                                              <p className="mt-1 truncate text-xs text-[#f0f0f5]/30">
                                                  {word.pronunciation}
                                              </p>
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
                              ))
                            : filteredEntries.map((entry) => (
                                  <VocabularyEntryCard key={entry.id} entry={entry} />
                              ))}
                    </div>
                )}
            </div>
        </div>
    );
}
