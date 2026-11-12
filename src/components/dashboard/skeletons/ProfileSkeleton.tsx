// ARCHITECT: скелетон «Профиля»: карточка пользователя, два счётчика, блок навыков и «Прогресс по
// направлениям». Сетки те же, что у страницы, поэтому на телефоне каркас остаётся в одну колонку.

import { Skeleton } from "@/components/ui/skeleton";

const SKILL_ROWS = [0, 1, 2, 3];
const MODE_ROWS = [0, 1, 2, 3];

export function ProfileSkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-6xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-24" />
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-4 rounded-2xl bg-[#111113] p-4 sm:flex-row sm:items-center md:p-5">
                        <Skeleton className="size-16 shrink-0 rounded-2xl md:size-24" />
                        <div className="min-w-0 flex-1">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="mt-3 h-4 w-56" />
                            <Skeleton className="mt-3 h-4 w-24" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[0, 1].map((id) => (
                            <div key={id} className="flex items-center gap-3 rounded-xl bg-[#141416] p-4">
                                <Skeleton className="size-10 shrink-0 rounded-lg" />
                                <div className="min-w-0">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="mt-2 h-5 w-12" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-4 md:p-5">
                        <Skeleton className="h-5 w-40" />
                        <div className="mt-4 flex flex-col">
                            {SKILL_ROWS.map((id) => (
                                <div key={id} className="border-b border-white/5 py-3 last:border-b-0">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-10" />
                                    </div>
                                    <Skeleton className="mt-2 h-3 w-48" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#111113] p-4 md:p-5">
                        <Skeleton className="h-5 w-52" />
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {MODE_ROWS.map((id) => (
                                <Skeleton key={id} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}