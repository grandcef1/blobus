// ARCHITECT: не-React часть ambient-фона. Вынесена из компонента, чтобы тот держался
// в пределах 150 строк и чтобы бюджет кадра можно было переиспользовать отдельно.

export interface ViewportBudget {
    maxPixelCount: number;
    minPixelRatio: number;
    speed: number;
}

const MOBILE_BREAKPOINT_PX = 768;
const DESKTOP_DPR_CAP = 1.5;
const MOBILE_DPR_CAP = 1.25;
const IDLE_TIMEOUT_MS = 1200;

/**
 * Потолок физических пикселей и скорость дрейфа под текущее окно.
 * `layerInsetPx` — на сколько слой шире вьюпорта (запас под сдвиг параллакса):
 * без учёта запаса потолок DPR не достигается, канвас выходит меньше заявленного.
 */
export function computeViewportBudget(layerInsetPx: number): ViewportBudget {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    const dprCap = isMobile ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP;
    const layerWidth = window.innerWidth + layerInsetPx * 2;
    const layerHeight = window.innerHeight + layerInsetPx * 2;
    return {
        maxPixelCount: Math.ceil(layerWidth * dprCap * layerHeight * dprCap),
        minPixelRatio: dprCap,
        speed: isMobile ? 0.35 : 0.5,
    };
}

// ARCHITECT: paper-design бросает исключение, если webgl2 недоступен, причём внутри
// асинхронного эффекта — это необработанный reject. Поэтому проверяем заранее
// и сразу отпускаем пробный контекст.
export function supportsWebGl2(): boolean {
    try {
        const probe = document.createElement("canvas");
        const gl = probe.getContext("webgl2");
        if (gl === null) return false;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return true;
    } catch {
        return false;
    }
}

/** Отложенный запуск тяжёлой инициализации; возвращает отмену. */
export function scheduleIdle(task: () => void): () => void {
    if (typeof window.requestIdleCallback === "function") {
        const handle = window.requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
        return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(task, IDLE_TIMEOUT_MS);
    return () => window.clearTimeout(handle);
}
