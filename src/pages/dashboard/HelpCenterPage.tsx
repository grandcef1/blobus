// ARCHITECT: /app/help — тот же HelpCenter внутри приложения. Обёртка задаёт рамку раздела и
// держит загрузку FAQ: пока контент в пути, показывается скелетон, а не пустая страница.
// ARCHITECT: заголовок вкладки ставит AppLayout по карте разделов. Здесь он не задаётся: иначе
// название помощи оставалось бы в шапке и после перехода на соседний экран.

import { fetchFaqItems } from "@/api/support";
import { useMockQuery } from "@/hooks/useMockQuery";
import { HelpSkeleton } from "@/components/dashboard/skeletons/HelpSkeleton";
import { HelpCenter } from "@/components/help/HelpCenter";

export function HelpCenterPage() {
    const { data: faqItems, isLoading } = useMockQuery(fetchFaqItems);

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                {isLoading || faqItems === null ? <HelpSkeleton /> : <HelpCenter faqItems={faqItems} />}
            </div>
        </div>
    );
}
