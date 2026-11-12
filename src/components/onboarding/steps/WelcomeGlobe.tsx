// ARCHITECT: купол глобуса. Геометрия вынесена в GEOMETRY: одна точка правды для линий купола.
// Рисование — CSS keyframes по stroke-dashoffset (index.css): непрерывная волна без покадровых
// шагов JS. Длина линии нормализована pathLength=1000, dasharray и стартовый offset — целые
// ±1000: дробные значения давали артефакты сглаживания в WebKit.
// ARCHITECT: на экранах уже 768px волна читается как артефакт, поэтому там купол сразу полностью
// нарисован: те же <path> без dasharray и без слоя анимации. Статичный вариант — значение по
// умолчанию до гидрации (useMediaQuery отдаёт false на серверном снимке), поэтому первый кадр на
// телефоне не запускает волну; useReducedMotion даёт тот же статичный вариант.
// ARCHITECT: свечение — статичный дубль геометрии с одним drop-shadow; на мобильных класса
// анимации нет и свечение видно сразу. Исключение по свечению (CONFLICT с п. 3.5 правил)
// согласовано для welcome — единственного церемониального экрана; свечение статично и монохромно.
// ARCHITECT: draw и drawVars дублируют друг друга осознанно: Tailwind v4 собирает произвольные
// классы только из статического текста, поэтому числовое draw описывает замысел, а литеральные
// классы в drawVars — то, что реально попадает в бандл.

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface WelcomeGlobeProps {
    className?: string;
}

interface GlobeDraw {
    /** Направление роста линии: -1 — справа налево, 1 — слева направо. */
    from: 1 | -1;
    delay: number;
    duration: number;
}

interface GlobeElement {
    d: string;
    strokeWidth: number;
    opacity: number;
    draw: GlobeDraw;
    /** Литеральные классы CSS-переменных отрисовки: их читает Tailwind. */
    drawVars: string;
}

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

const GEOMETRY: GlobeElement[] = [
    // контур купола — рост справа налево
    {
        d: "M 40 480 A 760 460 0 0 1 1560 480",
        strokeWidth: 2.2, opacity: 0.55,
        draw: { from: -1, delay: 0, duration: 1600 },
        drawVars: "[--globe-offset:-1000] [--globe-delay:0ms] [--globe-duration:1600ms]",
    },
    // меридианы — встречные направления
    {
        d: "M 180 480 A 620 460 0 0 1 1420 480",
        strokeWidth: 1.6, opacity: 0.3,
        draw: { from: 1, delay: 200, duration: 1500 },
        drawVars: "[--globe-offset:1000] [--globe-delay:200ms] [--globe-duration:1500ms]",
    },
    {
        d: "M 400 480 A 400 460 0 0 1 1200 480",
        strokeWidth: 1.6, opacity: 0.22,
        draw: { from: -1, delay: 350, duration: 1300 },
        drawVars: "[--globe-offset:-1000] [--globe-delay:350ms] [--globe-duration:1300ms]",
    },
    // ось — поднимается снизу вверх
    {
        d: "M 800 20 L 800 480",
        strokeWidth: 1.6, opacity: 0.25,
        draw: { from: -1, delay: 450, duration: 1200 },
        drawVars: "[--globe-offset:-1000] [--globe-delay:450ms] [--globe-duration:1200ms]",
    },
    // параллели — чередование направлений
    {
        d: "M 76 340 L 1524 340",
        strokeWidth: 1.6, opacity: 0.3,
        draw: { from: 1, delay: 600, duration: 1200 },
        drawVars: "[--globe-offset:1000] [--globe-delay:600ms] [--globe-duration:1200ms]",
    },
    {
        d: "M 197 200 L 1403 200",
        strokeWidth: 1.6, opacity: 0.24,
        draw: { from: -1, delay: 750, duration: 1100 },
        drawVars: "[--globe-offset:-1000] [--globe-delay:750ms] [--globe-duration:1100ms]",
    },
    {
        d: "M 397 90 L 1203 90",
        strokeWidth: 1.6, opacity: 0.18,
        draw: { from: 1, delay: 850, duration: 900 },
        drawVars: "[--globe-offset:1000] [--globe-delay:850ms] [--globe-duration:900ms]",
    },
    // горизонт — завершает композицию
    {
        d: "M 0 479.5 L 1600 479.5",
        strokeWidth: 2, opacity: 0.5,
        draw: { from: -1, delay: 1000, duration: 1300 },
        drawVars: "[--globe-offset:-1000] [--globe-delay:1000ms] [--globe-duration:1300ms]",
    },
];

const GLOW_FILTER = "[filter:drop-shadow(0_0_18px_rgba(240,240,245,0.35))]";

export function WelcomeGlobe({ className }: WelcomeGlobeProps) {
    const reduceMotion = useReducedMotion();
    const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
    const isStatic = !isDesktop || Boolean(reduceMotion);

    return (
        <svg
            viewBox="0 0 1600 480"
            preserveAspectRatio="xMidYMax slice"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            {GEOMETRY.map((element) => (
                <path
                    key={element.d}
                    d={element.d}
                    fill="none"
                    stroke="#f0f0f5"
                    strokeWidth={element.strokeWidth}
                    strokeLinecap="round"
                    strokeOpacity={element.opacity}
                    pathLength={isStatic ? undefined : 1000}
                    strokeDasharray={isStatic ? undefined : 1000}
                    className={cn(!isStatic && "globe-line", !isStatic && element.drawVars)}
                />
            ))}

            {/* ARCHITECT: статичный слой свечения — та же геометрия без анимации линий. */}
            <g
                className={cn(GLOW_FILTER, !isStatic && "globe-glow")}
                fill="none"
                stroke="#f0f0f5"
                strokeLinecap="round"
            >
                {GEOMETRY.map((element) => (
                    <path
                        key={element.d}
                        d={element.d}
                        strokeWidth={element.strokeWidth}
                        strokeOpacity={element.opacity}
                    />
                ))}
            </g>
        </svg>
    );
}
