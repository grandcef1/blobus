// ARCHITECT: скелетоны повторяют финальную раскладку экранов: каркас тот же, поэтому контент встаёт
// на место без скачка. Раскладка «Обзора» — карточка продолжения, четыре метрики, недельная активность и
// последние сессии, поэтому скелетон повторяет именно её.

import { Skeleton } from "@/components/ui/skeleton";

const METRICS = [0, 1, 2, 3];
const WEEK_BARS = [0, 1, 2, 3, 4, 5, 6];
const SESSION_ROWS = [0, 1, 2];

export function OverviewSkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-6xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="mt-2 h-4 w-64" />
                </div>

                <div className="space-y-4">
                    <Skeleton className="h-24 rounded-2xl" />

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {METRICS.map((id) => (
                            <div key={id} className="rounded-xl bg-[#141416] p-4 md:p-5">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="mt-3 h-7 w-14" />
                            </div>
                        ))}
                    </div>

                    <Skeleton className="h-20 rounded-2xl" />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl bg-[#111113] p-4 md:p-5">
                            <Skeleton className="h-5 w-44" />
                            <div className="mt-4 flex h-32 items-end gap-2">
                                {WEEK_BARS.map((id) => (
                                    <Skeleton key={id} className="h-24 flex-1 rounded-sm" />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-[#111113] p-4 md:p-5">
                            <Skeleton className="h-5 w-32" />
                            <div className="mt-4 space-y-2">
                                {SESSION_ROWS.map((id) => (
                                    <Skeleton key={id} className="h-14 rounded-xl" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
