// ARCHITECT: статус показывается текстом и тонким маркером, а не цветной плашкой — требование
// палитры проекта. Насыщенность маркера передаёт вес состояния, цвет не тратится.

import { cn } from "@/lib/utils";

type StatusEmphasis = "solid" | "muted" | "faint";

interface StatusMarkerProps {
    label: string;
    emphasis?: StatusEmphasis;
    className?: string;
}

const DOT_OPACITY: Record<StatusEmphasis, string> = {
    solid: "bg-[#f0f0f5]/70",
    muted: "bg-[#f0f0f5]/40",
    faint: "bg-[#f0f0f5]/20",
};

export function StatusMarker({ label, emphasis = "muted", className }: StatusMarkerProps) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-xs text-[#f0f0f5]/60", className)}>
            <span className={cn("size-1.5 shrink-0 rounded-full", DOT_OPACITY[emphasis])} aria-hidden="true" />
            {label}
        </span>
    );
}
