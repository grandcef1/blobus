// ARCHITECT: индикатор сложности пароля — цветной: rose (слабый),
// amber (средний/хороший), emerald (надёжный). Цвет = значимое состояние,
// поэтому здесь он уместен вопреки монохрому остальных экранов.

import { Check } from "lucide-react";
import { getPasswordChecks } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
    password: string;
}

const SCORE_STYLES = [
    { bar: "bg-rose-400", text: "text-rose-300", label: "Очень слабый" },
    { bar: "bg-rose-400", text: "text-rose-300", label: "Слабый" },
    { bar: "bg-amber-400", text: "text-amber-300", label: "Средний" },
    { bar: "bg-amber-400", text: "text-amber-300", label: "Хороший" },
    { bar: "bg-emerald-400", text: "text-emerald-300", label: "Надёжный" },
] as const;

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    if (!password) return null;

    const checks = getPasswordChecks(password);
    const score = checks.filter((check) => check.passed).length;
    const scoreStyle = SCORE_STYLES[score];

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3">
                <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                index < score ? scoreStyle.bar : "bg-white/10"
                            )}
                        />
                    ))}
                </div>
                <span className={cn("text-xs", scoreStyle.text)}>{scoreStyle.label}</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {checks.map((check) => (
                    <li
                        key={check.id}
                        className={cn(
                            "flex items-center gap-1.5 text-[11px]",
                            check.passed ? "text-emerald-300/80" : "text-[#f0f0f5]/30"
                        )}
                    >
                        <Check
                            className={cn("size-3 shrink-0", check.passed ? "opacity-100" : "opacity-25")}
                            aria-hidden="true"
                        />
                        {check.label}
                    </li>
                ))}
            </ul>
        </div>
    );
}