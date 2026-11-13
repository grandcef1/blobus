// ARCHITECT: скелетон экрана аудирования повторяет его раскладку: выход, заголовок с подписью и
// блок задания со строкой прогресса, счётчиком, вариантами и кнопками. Показывается и при загрузке
// заданий, и как Suspense fallback ленивого роута.

import { Skeleton } from "@/components/ui/skeleton";

const OPTION_ROWS = [0, 1, 2, 3];

export function ListeningSkeleton() {
    return (
        <div aria-busy="true">
            <Skeleton className="h-4 w-24" />

            <div className="mt-3">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="mt-2 h-4 w-72" />
            </div>

            <div className="mt-5 rounded-2xl border border-white/5 bg-[#111113] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-44 rounded-md" />
                        <Skeleton className="h-11 w-32 rounded-full" />
                    </div>
                </div>

                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-3 w-40" />

                <div className="mt-4 flex flex-col gap-2">
                    {OPTION_ROWS.map((id) => (
                        <Skeleton key={id} className="h-12 rounded-xl" />
                    ))}
                </div>

                <div className="mt-5 flex justify-end">
                    <Skeleton className="h-11 w-28 rounded-full" />
                </div>
            </div>
        </div>
    );
}