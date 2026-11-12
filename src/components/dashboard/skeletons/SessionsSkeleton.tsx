// ARCHITECT: скелетон «Сессий»: одна колонка на телефоне и две с lg — те же брейкпоинты, что у
// списка, иначе после загрузки карточки меняли бы ширину.

import { Skeleton } from "@/components/ui/skeleton";

const SESSION_ROWS = [0, 1, 2, 3];

export function SessionsSkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-6xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="mt-2 h-4 w-56" />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {SESSION_ROWS.map((id) => (
                        <div key={id} className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5">
                            <div className="flex items-start gap-4">
                                <Skeleton className="size-12 shrink-0 rounded-2xl" />
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="mt-2 h-3 w-56" />
                                </div>
                            </div>
                            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
                            <Skeleton className="mt-3 h-3 w-32" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}