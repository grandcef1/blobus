// ARCHITECT: состояние «сессии нет»: короткая строка и выход в список. Разметка одна для мок- и real-веток,
// поэтому живёт здесь, а не дублируется в двух видах чата (§5.4).

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ARCHITECT: высота — dvh минус мобильная шапка h-14 (3.5rem): с полным dvh экран уезжал бы под сгиб.
const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";

export function ChatNotFound() {
    const { t } = useTranslation("dashboard");

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-3 bg-black px-6 text-center",
                CHAT_HEIGHT
            )}
        >
            <p className="text-sm text-[#f0f0f5]/60">{t("sessions.notFound.title")}</p>
            <Link
                to="/app/sessions"
                className="text-sm text-[#f0f0f5] underline transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
            >
                {t("sessions.notFound.action")}
            </Link>
        </div>
    );
}
