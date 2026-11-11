// ARCHITECT: навигация шага — Назад слева, primary справа. Одна точка правды для
// кнопок: белая пилюля как «Начать» на welcome и стеклянный ghost для возврата.
// Логика переходов остаётся у шага, здесь только вид.

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/lib/surfaces";

interface StepNavProps {
    onBack?: () => void;
    onNext: () => void;
    nextLabel: string;
    disabled?: boolean;
    className?: string;
}

export function StepNav({ onBack, onNext, nextLabel, disabled, className }: StepNavProps) {
    return (
        <div className={cn("mt-8 flex items-center justify-between gap-4", className)}>
            {onBack ? (
                <Button type="button" variant="ghost" onClick={onBack} className={GHOST_BUTTON}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Назад
                </Button>
            ) : (
                <span />
            )}

            <Button type="button" onClick={onNext} disabled={disabled} className={PRIMARY_BUTTON}>
                {nextLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
        </div>
    );
}
