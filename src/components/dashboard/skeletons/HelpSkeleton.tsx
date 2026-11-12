// ARCHITECT: скелетон «Центра помощи»: шапка с кнопкой обращения, поиск, вкладки категорий и блоки
// вопросов, справа — колонка обращений. Раскладка 2fr/1fr та же, что у страницы, поэтому колонки не
// прыгают после загрузки.

import { Skeleton } from "@/components/ui/skeleton";

const FAQ_ROWS = [0, 1, 2, 3, 4];
const TICKET_ROWS = [0, 1];

export function HelpSkeleton() {
    return (
        <div className="flex flex-col gap-6" aria-busy="true">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-2 h-4 w-64" />
                </div>
                <Skeleton className="h-11 w-40 rounded-full" />
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                <div>
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <Skeleton className="mt-3 h-9 w-72 rounded-full" />

                    <div className="mt-3 flex flex-col gap-2">
                        {FAQ_ROWS.map((id) => (
                            <div
                                key={id}
                                className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-4"
                            >
                                <Skeleton className="h-4 w-56" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5">
                    <Skeleton className="h-5 w-32" />
                    <div className="mt-4 space-y-2">
                        {TICKET_ROWS.map((id) => (
                            <Skeleton key={id} className="h-16 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}