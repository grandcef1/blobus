// ARCHITECT: скелетон «Словаря»: шапка с кнопкой повторения, поле поиска и строки слов — как у
// списка. Строка повторяет две колонки карточки слова, поэтому на телефоне она не ломается.

import { Skeleton } from "@/components/ui/skeleton";

const WORD_ROWS = [0, 1, 2, 3, 4, 5];

export function VocabularySkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-4xl">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="mt-2 h-4 w-40" />
                    </div>
                    <Skeleton className="h-10 w-32 shrink-0 rounded-xl" />
                </div>

                <Skeleton className="mb-4 h-11 w-full rounded-xl" />

                <div className="space-y-2">
                    {WORD_ROWS.map((id) => (
                        <div key={id} className="rounded-xl bg-[#141416] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="mt-2 h-3 w-40" />
                                    <Skeleton className="mt-2 h-3 w-24" />
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <Skeleton className="h-3 w-8" />
                                    <Skeleton className="h-1 w-16 rounded-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}