// ARCHITECT: статус обращения — текст и тонкий маркер-точка, без заливок: правило палитры.
// Цвет есть только у маркера, текст всегда монохромный.

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_KEYS } from "@/types/support";
import type { SupportTicketStatus } from "@/types/support";

const STATUS_TONE: Record<SupportTicketStatus, string> = {
    open: "bg-[#f0f0f5]/60",
    in_progress: "bg-blue-400",
    resolved: "bg-green-400",
};

interface TicketStatusBadgeProps {
    status: SupportTicketStatus;
    className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
    const { t } = useTranslation("common");

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 text-xs text-[#f0f0f5]/60",
                className
            )}
        >
            <span className={cn("size-1.5 rounded-full", STATUS_TONE[status])} aria-hidden="true" />
            {t(TICKET_STATUS_KEYS[status])}
        </span>
    );
}
