// ARCHITECT: скелетон «Подписки»: переключатель периода, два тарифа и два блока платежей — та же
// колонка max-w-3xl, что у страницы.

import { Skeleton } from "@/components/ui/skeleton";

export function BillingSkeleton() {
    return (
        <div className="min-h-screen bg-black p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-3xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-28" />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Skeleton className="h-10 w-56 rounded-lg" />
                    </div>

                    <div className="space-y-3">
                        {[0, 1].map((id) => (
                            <div key={id} className="rounded-2xl bg-[#141416] p-5">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="mt-2 h-3 w-48" />
                                <Skeleton className="mt-4 h-8 w-24" />
                                <div className="mt-4 space-y-2">
                                    {[0, 1, 2, 3, 4].map((rowId) => (
                                        <Skeleton key={rowId} className="h-4 w-52" />
                                    ))}
                                </div>
                                <Skeleton className="mt-5 h-10 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="mt-4 h-16 rounded-xl" />
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-5">
                        <Skeleton className="h-5 w-40" />
                        <div className="mt-4 space-y-2">
                            {[0, 1].map((id) => (
                                <Skeleton key={id} className="h-14 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}