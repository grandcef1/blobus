// ARCHITECT: статус обращения — текст и тонкий маркер-точка, без заливок: правило палитры.
// Цвет есть только у маркера, текст всегда монохромный.

import { cn } from "@/lib/utils";
import type { SupportTicketStatus } from "@/types/support";

const STATUS_TONE: Record<SupportTicketStatus, { label: string; dot: string }> = {
    open: { label: "Открыт", dot: "bg-[#f0f0f5]/60" },
    in_progress: { label: "В работе", dot: "bg-blue-400" },
    resolved: { label: "Решён", dot: "bg-green-400" },
};

interface TicketStatusBadgeProps {
    status: SupportTicketStatus;
    className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
    const tone = STATUS_TONE[status];

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 text-xs text-[#f0f0f5]/60",
                className
            )}
        >
            <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden="true" />
            {tone.label}
        </span>
    );
}
