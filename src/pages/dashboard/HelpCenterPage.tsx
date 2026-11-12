// ARCHITECT: /app/help — тот же HelpCenter внутри приложения. Обёртка задаёт только рамку
// раздела: отступы и ширину, как у остальных рабочих экранов.

import { useEffect } from "react";
import { HelpCenter } from "@/components/help/HelpCenter";

export function HelpCenterPage() {
    useEffect(() => {
        document.title = "Центр помощи — Blobus";
    }, []);

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <HelpCenter />
            </div>
        </div>
    );
}
