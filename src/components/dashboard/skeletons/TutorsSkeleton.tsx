// ARCHITECT: скелетон «Репетиторов»: та же сетка 1/2/3 колонки, что у карточек, поэтому список не
// перестраивается после загрузки. Карточка держит место под аватар, имя, черты и кнопку.

import { Skeleton } from "@/components/ui/skeleton";

const TUTOR_ROWS = [0, 1, 2, 3, 4, 5];

export function TutorsSkeleton() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-6xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="mt-2 h-4 w-72" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {TUTOR_ROWS.map((id) => (
                        <div key={id} className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5">
                            <div className="flex items-start gap-4">
                                <Skeleton className="size-16 shrink-0 rounded-2xl" />
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="mt-2 h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="mt-3 h-4 w-full" />
                            <Skeleton className="mt-4 h-4 w-24" />
                            <Skeleton className="mt-4 h-11 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}