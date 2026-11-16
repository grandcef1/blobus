// ARCHITECT: скелетон оболочки панели: левая рельса и правая колонка с топбаром и контентными блоками
// — тот же каркас, что у AppLayout, поэтому после загрузки чанка сайдбар встаёт на место без скачка.
// ARCHITECT: ширина рельсы и отступ main заданы произвольными значениями (72px): они зеркалят
// SIDEBAR_WIDTH_COLLAPSED из Sidebar.tsx, а утилиты Tailwind такой размер не выражают (правило 3.3).

import { Skeleton } from "@/components/ui/skeleton";

const NAV_ROWS = [0, 1, 2, 3, 4];
const METRIC_CARDS = [0, 1, 2, 3];

export function AppShellSkeleton() {
    return (
        <div className="flex min-h-dvh bg-black text-[#f0f0f5]" aria-busy="true">
            <aside className="fixed left-0 top-0 hidden h-dvh w-[72px] flex-col items-center gap-3 border-r border-white/5 bg-[#0d0d0d] py-4 md:flex">
                <Skeleton className="size-10 rounded-xl" />
                {NAV_ROWS.map((id) => (
                    <Skeleton key={id} className="size-10 rounded-xl" />
                ))}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-black/80 px-2 md:hidden">
                    <Skeleton className="size-11 rounded-xl" />
                    <Skeleton className="mx-auto h-4 w-28" />
                    <Skeleton className="size-8 rounded-full" />
                </div>

                <main className="min-w-0 flex-1 p-4 md:ml-[72px] md:p-6">
                    <div className="mx-auto max-w-6xl space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-24 rounded-2xl" />

                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {METRIC_CARDS.map((id) => (
                                <Skeleton key={id} className="h-20 rounded-xl" />
                            ))}
                        </div>

                        <Skeleton className="h-40 rounded-2xl" />
                    </div>
                </main>
            </div>
        </div>
    );
}
