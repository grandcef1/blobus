// ARCHITECT: стеклянная карточка шага. Токены берутся из surfaces.ts, поэтому вид
// карточки совпадает с карточкой welcome по конструкции, а не по копипасте классов.
// Форма leaf доступна как параметр, но по умолчанию у шагов единый CARD_RADIUS.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CARD_RADIUS, GLASS_SURFACE, LEAF_RADIUS } from "@/lib/surfaces";

interface StepCardProps {
    children: ReactNode;
    className?: string;
    /** leaf — форма карточки welcome, card — стандартная для сеток и форм. */
    shape?: "card" | "leaf";
}

export function StepCard({ children, className, shape = "card" }: StepCardProps) {
    return (
        <div className={cn(GLASS_SURFACE, shape === "leaf" ? LEAF_RADIUS : CARD_RADIUS, "p-6", className)}>
            {children}
        </div>
    );
}
