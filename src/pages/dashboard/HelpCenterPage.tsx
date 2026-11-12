// ARCHITECT: /app/help — тот же HelpCenter внутри приложения. Обёртка задаёт только рамку
// раздела: отступы и ширину, как у остальных рабочих экранов.
// ARCHITECT: заголовок вкладки ставит AppLayout по карте разделов. Здесь он больше не задаётся:
// иначе название помощи оставалось бы в шапке и после перехода на соседний экран.

import { HelpCenter } from "@/components/help/HelpCenter";

export function HelpCenterPage() {
    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <HelpCenter />
            </div>
        </div>
    );
}
