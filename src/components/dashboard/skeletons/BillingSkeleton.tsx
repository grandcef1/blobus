// ARCHITECT: скелетон «Подписки» повторяет раскладку экрана: заголовок, карточка тарифа, блок расхода
// сообщений и список платежей — той же колонкой max-w-3xl, что у страницы. Отдельный скелетон на
// каждое состояние не нужен: набор блоков один и тот же.

import { Skeleton } from "@/components/ui/skeleton";

export function BillingSkeleton() {
    return (
        <div className="min-h-screen bg-black p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-3xl space-y-4">
                <Skeleton className="h-6 w-28" />

                <div className="rounded-2xl bg-[#111113] p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 h-6 w-40" />
                    <Skeleton className="mt-3 h-4 w-32" />
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Skeleton className="h-10 w-36 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-lg" />
                    </div>
                </div>

                <div className="rounded-2xl bg-[#111113] p-5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
                </div>

                <div className="rounded-2xl bg-[#111113] p-5">
                    <Skeleton className="h-4 w-24" />
                    <div className="mt-3 space-y-2">
                        {[0, 1].map((id) => (
                            <Skeleton key={id} className="h-16 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
