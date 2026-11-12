// ARCHITECT: скелетон «Настроек»: две карточки со строками-переключателями, как на странице.
// Колонка уже (max-w-2xl), поэтому каркас повторяет её ширину и не тянется на весь экран.

import { Skeleton } from "@/components/ui/skeleton";

const SETTING_ROWS = [0, 1, 2, 3];

export function SettingsSkeleton() {
    return (
        <div className="min-h-screen bg-black p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-2xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-28" />
                </div>

                <div className="space-y-4">
                    {[0, 1].map((cardId) => (
                        <div key={cardId} className="rounded-2xl bg-[#111113] p-5">
                            <Skeleton className="h-5 w-40" />
                            <div className="mt-4 space-y-2">
                                {SETTING_ROWS.map((rowId) => (
                                    <div
                                        key={rowId}
                                        className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="mt-2 h-3 w-52" />
                                        </div>
                                        <Skeleton className="ml-4 h-5 w-9 shrink-0 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}