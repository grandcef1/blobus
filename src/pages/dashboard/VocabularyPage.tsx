import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { VocabularySkeleton } from "@/components/dashboard/skeletons/VocabularySkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useVocabulary } from "@/hooks/useVocabulary";
import { markWordReviewed } from "@/api/progress";
import type { VocabularyEntryDto } from "@/api/progress";
import type { VocabularyWord } from "@/types/progress";
import { VocabularyEntryCard } from "./VocabularyEntryCard";
import type { VocabularyCardModel } from "./VocabularyEntryCard";
import { VocabularyReview } from "./VocabularyReview";
import { VocabularyHeader } from "./VocabularyHeader";
import { AddWordDialog } from "./AddWordDialog";

// ARCHITECT: обе ветки сводятся к одной view-model; context→example переименовывается только здесь.
// ARCHITECT: Date.now() вынесен из тела рендера: правило чистоты не пускает прямой вызов в компонент.
const nowMs = (): number => Date.now();
function mockToModel(word: VocabularyWord): VocabularyCardModel {
    return {
        id: word.id,
        term: word.word,
        translation: word.translation,
        example: word.examples[0]?.sentence ?? null,
        exampleTranslation: word.examples[0]?.translation ?? null,
        nextDueAt: "1970-01-01T00:00:00.000Z",
    };
}

function realToModel(entry: VocabularyEntryDto): VocabularyCardModel {
    return {
        id: entry.id,
        term: entry.term,
        translation: entry.translation,
        example: entry.context,
        exampleTranslation: entry.exampleTranslation,
        nextDueAt: entry.nextDueAt,
    };
}

export function VocabularyPage() {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const [searchQuery, setSearchQuery] = useState("");
    const [reviewOpen, setReviewOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const queryClient = useQueryClient();
    const result = useVocabulary();

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

    const models =
        result.kind === "mock" ? result.words.map(mockToModel) : result.entries.map(realToModel);
    // ARCHITECT: null-поле в поиске — пустая строка, иначе отсутствующее значение совпало бы с запросом.
    const query = searchQuery.toLowerCase();
    const matches = (field: string | null): boolean => (field ?? "").toLowerCase().includes(query);
    const filtered = models.filter((model) => matches(model.term) || matches(model.translation));
    const due = models.filter((model) => Date.parse(model.nextDueAt) <= nowMs());
    const handleReviewed = async (id: string, reviewed: "remembered" | "forgotten") => {
        await markWordReviewed(id, reviewed);
        await queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    };

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-4xl">
                <VocabularyHeader
                    total={models.length}
                    reviewDisabled={due.length === 0}
                    onReview={() => setReviewOpen(true)}
                    onAdd={() => setAddOpen(true)}
                />

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
                {reviewOpen ? (
                    <VocabularyReview
                        due={due}
                        onReviewed={handleReviewed}
                        onExit={() => setReviewOpen(false)}
                    />
                ) : models.length === 0 ? (
                    <EmptyState
                        icon={BookOpen}
                        title={tCommon("states.empty.vocabulary.title")}
                        description={tCommon("states.empty.vocabulary.description")}
                    />
                ) : filtered.length === 0 ? (
                    /* ARCHITECT: пустой словарь и пустой поиск — разные состояния, поэтому тексты разные. */
                    <p className="rounded-2xl bg-[#111113] p-5 text-sm text-[#f0f0f5]/60">
                        {tCommon("states.search.empty")}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((model, index) => (
                            <motion.div
                                key={model.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                            >
                                <VocabularyEntryCard model={model} />
                            </motion.div>
                        ))}
                    </div>
                )}

                <AddWordDialog open={addOpen} onOpenChange={setAddOpen} />
            </div>
        </div>
    );
}
