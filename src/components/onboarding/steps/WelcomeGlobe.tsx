// ARCHITECT: купол глобуса. Рисование переведено на CSS keyframes по stroke-dashoffset: одна
// непрерывная волна без покадровых шагов JS, из-за которых на мобильных в конце был рывок.
// Темп сохранён (~2.3 s: последняя линия начинается на 1 s и идёт 1.3 s), как и разнонаправленный
// рост линий. Длина каждой линии нормализована pathLength=1000, dasharray и стартовый offset —
// целые ±1000: дробные значения давали артефакты сглаживания в WebKit. Прозрачность линии во
// время рисования постоянна, поэтому волна не мерцает.
// ARCHITECT: свечение — отдельный статичный дубль геометрии с одним мягким drop-shadow, который
// проявляется по opacity после окончания отрисовки. Фильтр на анимируемом слое заставлял
// перерастеризовывать линии каждый кадр; статичный дубль композитится один раз.
// ARCHITECT (CONFLICT с п. 3.5 правил — запрет свечения): исключение согласовано для welcome —
// единственного церемониального экрана; свечение статично, монохромно и нигде больше не
// повторяется. Также <path> вместо <line>: нормализация длины через pathLength работает во всех
// браузерах, включая WebKit.

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WelcomeGlobeProps {
    className?: string;
}

interface GlobeLine {
    d: string;
    strokeWidth: number;
    opacity: number;
    /** CSS-переменные отрисовки: стартовый offset, задержка, длительность. */
    drawVars: string;
}

const LINES: GlobeLine[] = [
    // контур купола — рост справа налево
    {
        d: "M 40 480 A 760 460 0 0 1 1560 480",
        strokeWidth: 2.2,
        opacity: 0.55,
        drawVars: "[--globe-offset:-1000] [--globe-delay:0ms] [--globe-duration:1600ms]",
    },
    // меридианы — встречные направления
    {
        d: "M 180 480 A 620 460 0 0 1 1420 480",
        strokeWidth: 1.6,
        opacity: 0.3,
        drawVars: "[--globe-offset:1000] [--globe-delay:200ms] [--globe-duration:1500ms]",
    },
    {
        d: "M 400 480 A 400 460 0 0 1 1200 480",
        strokeWidth: 1.6,
        opacity: 0.22,
        drawVars: "[--globe-offset:-1000] [--globe-delay:350ms] [--globe-duration:1300ms]",
    },
    // ось — поднимается снизу вверх
    {
        d: "M 800 20 L 800 480",
        strokeWidth: 1.6,
        opacity: 0.25,
        drawVars: "[--globe-offset:-1000] [--globe-delay:450ms] [--globe-duration:1200ms]",
    },
    // параллели — чередование направлений
    {
        d: "M 76 340 L 1524 340",
        strokeWidth: 1.6,
        opacity: 0.3,
        drawVars: "[--globe-offset:1000] [--globe-delay:600ms] [--globe-duration:1200ms]",
    },
    {
        d: "M 197 200 L 1403 200",
        strokeWidth: 1.6,
        opacity: 0.24,
        drawVars: "[--globe-offset:-1000] [--globe-delay:750ms] [--globe-duration:1100ms]",
    },
    {
        d: "M 397 90 L 1203 90",
        strokeWidth: 1.6,
        opacity: 0.18,
        drawVars: "[--globe-offset:1000] [--globe-delay:850ms] [--globe-duration:900ms]",
    },
    // горизонт — завершает композицию
    {
        d: "M 0 479.5 L 1600 479.5",
        strokeWidth: 2,
        opacity: 0.5,
        drawVars: "[--globe-offset:-1000] [--globe-delay:1000ms] [--globe-duration:1300ms]",
    },
];

const GLOW_FILTER = "[filter:drop-shadow(0_0_18px_rgba(240,240,245,0.35))]";

export function WelcomeGlobe({ className }: WelcomeGlobeProps) {
    const reduceMotion = useReducedMotion();

    return (
        <svg
            viewBox="0 0 1600 480"
            preserveAspectRatio="xMidYMax slice"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            {LINES.map((line) => (
                <path
                    key={line.d}
                    d={line.d}
                    fill="none"
                    stroke="#f0f0f5"
                    strokeWidth={line.strokeWidth}
                    strokeLinecap="round"
                    strokeOpacity={line.opacity}
                    pathLength={1000}
                    strokeDasharray={1000}
                    strokeDashoffset={reduceMotion ? 0 : undefined}
                    className={cn(!reduceMotion && "globe-line", line.drawVars)}
                />
            ))}

            {/* ARCHITECT: статичный слой свечения — та же геометрия без анимации линий. */}
            <g
                className={cn(GLOW_FILTER, !reduceMotion && "globe-glow")}
                fill="none"
                stroke="#f0f0f5"
                strokeLinecap="round"
            >
                {LINES.map((line) => (
                    <path
                        key={line.d}
                        d={line.d}
                        strokeWidth={line.strokeWidth}
                        strokeOpacity={line.opacity}
                    />
                ))}
            </g>
        </svg>
    );
}
