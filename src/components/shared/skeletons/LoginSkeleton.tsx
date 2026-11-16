// ARCHITECT: скелетон экрана входа для Suspense на маршруте /login. Раньше fallback был null, и
// пока грузился чанк, пользователь видел белый лист. Каркас повторяет Login: центрированный блок
// max-w-xl, заголовок шага и карточка с двумя полями, кнопкой, разделителем и входом через Google,
// поэтому контент встаёт на место без скачка. Оболочка мастера (WebGL-фон) сюда не подключается:
// скелетон не должен тянуть в основной бандл то, что грузится лениво.

import { Skeleton } from "@/components/ui/skeleton";
import { CARD_RADIUS, GLASS_SURFACE } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const FIELD_ROWS = [0, 1];

export function LoginSkeleton() {
    return (
        <div
            className="flex min-h-dvh w-full flex-col items-center justify-center bg-black"
            aria-busy="true"
        >
            <div className="w-full max-w-xl px-6">
                <div className="mb-8 text-center">
                    <Skeleton className="mx-auto h-4 w-20" />
                    <Skeleton className="mx-auto mt-3 h-8 w-56" />
                    <Skeleton className="mx-auto mt-3 h-4 w-72" />
                </div>

                <div className={cn(GLASS_SURFACE, CARD_RADIUS, "p-6")}>
                    <div className="flex flex-col gap-6">
                        {FIELD_ROWS.map((id) => (
                            <div key={id} className="flex flex-col gap-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                        ))}

                        <Skeleton className="h-11 w-full rounded-full" />

                        <div className="flex items-center gap-3 pt-1">
                            <div className="h-px flex-1 bg-white/10" />
                            <div className="h-px flex-1 bg-white/10" />
                        </div>

                        <Skeleton className="h-11 w-full rounded-full" />
                    </div>
                </div>

                <Skeleton className="mx-auto mt-4 h-4 w-40" />
            </div>
        </div>
    );
}
