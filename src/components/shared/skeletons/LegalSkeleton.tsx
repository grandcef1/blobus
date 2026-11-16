// ARCHITECT: скелетон правовых страниц повторяет LegalLayout: возврат на главную, заголовок, строка
// даты и три раздела текста. Ленивые документы открываются по прямой ссылке из футера, поэтому
// заглушка важна: белый лист на время загрузки чанка читается как сбой.

import { Skeleton } from "@/components/ui/skeleton";

const SECTION_ROWS = [0, 1, 2];

export function LegalSkeleton() {
    return (
        <main className="min-h-dvh w-full bg-black px-6 py-20 sm:px-8 sm:py-28" aria-busy="true">
            <article className="mx-auto w-full max-w-3xl">
                <Skeleton className="h-11 w-32 rounded-full" />
                <Skeleton className="mt-8 h-10 w-3/4" />
                <Skeleton className="mt-5 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-4 h-4 w-56" />

                <div className="mt-14 flex flex-col gap-12">
                    {SECTION_ROWS.map((id) => (
                        <div key={id} className="flex flex-col gap-4">
                            <Skeleton className="h-6 w-2/5" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </article>
        </main>
    );
}
