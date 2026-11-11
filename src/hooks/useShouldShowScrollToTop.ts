// ARCHITECT: порог зависит от высоты окна, поэтому scroll и resize обрабатываются одним
// планировщиком: пересчёт идёт от текущего innerHeight, а не от значения на момент маунта.
// ARCHITECT: RAF-throttle вместо debounce — состояние меняется максимум раз за кадр,
// без задержки реакции и без лишних setState.

import { useEffect, useState } from "react";

const MIN_THRESHOLD_PX = 600;
const VIEWPORT_THRESHOLD_RATIO = 1.5;

function getDefaultThreshold(): number {
    return Math.max(MIN_THRESHOLD_PX, Math.round(window.innerHeight * VIEWPORT_THRESHOLD_RATIO));
}

export function useShouldShowScrollToTop(threshold?: number): boolean {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        let frameId = 0;

        const update = (): void => {
            frameId = 0;
            const limit = threshold ?? getDefaultThreshold();
            setShouldShow(window.scrollY > limit);
        };

        const scheduleUpdate = (): void => {
            if (frameId !== 0) return;
            frameId = window.requestAnimationFrame(update);
        };

        // ARCHITECT: первый вызов синхронный — страница может открыться уже проскролленной.
        update();

        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);

        return () => {
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            if (frameId !== 0) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [threshold]);

    return shouldShow;
}
