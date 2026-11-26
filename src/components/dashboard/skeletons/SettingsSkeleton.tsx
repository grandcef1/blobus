// ARCHITECT: скелетон «Настроек»: одна карточка и пять строк в том же порядке, что на странице
// (звук, язык интерфейса, язык объяснений, автокоррекция, озвучка). Колонка уже (max-w-2xl), поэтому
// каркас повторяет её ширину и не тянется на весь экран.
// ARCHITECT: вид контрола повторяет страницу: тумблер — узкая пилюля, выбор языка — плашка селекта,
// а строка выбора идёт без пояснения, как в SettingSelect.

import { Skeleton } from "@/components/ui/skeleton";

// ARCHITECT: порядок строк страницы: три тумблера и два выбора языка.
const SETTING_ROWS = ["toggle", "select", "select", "toggle", "toggle"] as const;

export function SettingsSkeleton() {
    return (
        <div className="min-h-screen bg-black p-4 md:p-6" aria-busy="true">
            <div className="mx-auto max-w-2xl">
                <div className="mb-5">
                    <Skeleton className="h-6 w-28" />
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl bg-[#111113] p-5">
                        <Skeleton className="h-5 w-40" />
                        <div className="mt-4 space-y-2">
                            {SETTING_ROWS.map((control, rowId) => (
                                <div
                                    key={rowId}
                                    className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <Skeleton className="h-4 w-40" />
                                        {control === "toggle" && (
                                            <Skeleton className="mt-2 h-3 w-52" />
                                        )}
                                    </div>
                                    {control === "toggle" ? (
                                        <Skeleton className="ml-4 h-5 w-9 shrink-0 rounded-full" />
                                    ) : (
                                        <Skeleton className="ml-4 h-8 w-24 shrink-0 rounded-lg" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
