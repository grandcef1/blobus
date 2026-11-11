// ARCHITECT: единственный компонент прогресса на проект: ширина идёт от данных, поэтому
// inline-значение здесь неизбежно и остаётся только тут. Второй тон — для инвертированных
// светлых карточек, где белая заливка не видна.
// ARCHITECT: для доступности значение отдаётся ещё и числом (aria-valuenow), а не только
// цветом полосы.

import { cn } from "@/lib/utils";

type ProgressTone = "dark" | "inverted";

interface ProgressBarProps {
    value: number;
    tone?: ProgressTone;
    className?: string;
}

const TRACK_TONES: Record<ProgressTone, string> = {
    dark: "bg-white/5",
    inverted: "bg-black/10",
};

const FILL_TONES: Record<ProgressTone, string> = {
    dark: "bg-[#f0f0f5]/70",
    inverted: "bg-black",
};

export function ProgressBar({ value, tone = "dark", className }: ProgressBarProps) {
    const percent = Math.min(100, Math.max(0, Math.round(value)));

    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className={cn("h-1.5 w-full overflow-hidden rounded-full", TRACK_TONES[tone], className)}
        >
            {/* ARCHITECT: единственный оправданный inline-стиль: ширина полосы — это данные. */}
            <div
                className={cn("h-full rounded-full transition-[width] duration-300 ease-out", FILL_TONES[tone])}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
