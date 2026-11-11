// ARCHITECT: многослойный ambient-фон: чёрная база -> медленный органический градиент
// -> зерно (внутри шейдера, grainOverlay) -> виньетка к центру. Слои разделены, поэтому
// фон переиспользуется на других шагах онбординга и в hero без переписывания: наружу
// торчат только className и intensity.
// ARCHITECT: WebGL-слой грузится лениво через dynamic import по requestIdleCallback.
// Статический CSS-градиент той же палитры лежит под ним постоянно, поэтому до загрузки
// шейдера нет чёрной дыры, нет layout shift и нет вспышки при подмене. Он же служит
// фолбэком при prefers-reduced-motion, отсутствии WebGL и ошибке загрузки чанка.
// ARCHITECT: шейдер не грузится вообще, если motion сокращён или нет WebGL2 — тогда
// статичный кадр и никакого WebGL-контекста. Пауза при скрытой вкладке и при уходе
// слоя из вьюпорта, а также dispose контекста и слушателей — внутри paper-design
// (visibilitychange + IntersectionObserver + WEBGL_lose_context), дублировать не нужно.
// ARCHITECT: параллакс — только CSS-трансформ слоя, lerp через spring, ±12px: он не
// пересчитывает юниформы каждый кадр.

import { Suspense, lazy, useEffect, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { computeViewportBudget, scheduleIdle, supportsWebGl2 } from "@/lib/ambientBudget";
import type { ViewportBudget } from "@/lib/ambientBudget";

const AmbientMeshField = lazy(() =>
    import("./AmbientMeshField").then((module) => ({ default: module.AmbientMeshField }))
);

interface AmbientBackgroundProps {
    className?: string;
    /** Яркость свечения, 0..1. Виньетка и чёрная база не приглушаются. */
    intensity?: number;
}

// ARCHITECT: статическая композиция — её держит центр тяжести в левой верхней трети,
// она же статичный кадр для prefers-reduced-motion и фолбэк без WebGL. Меш ложится поверх
// полупрозрачным, поэтому живой и статичный вариант остаются в одной яркостной полосе.
// ARCHITECT: нижний широкий слой — «пол»: он повторяет среднюю яркость меша, чтобы
// фолбэк без WebGL не проваливался в чёрную дыру рядом с живым вариантом.
const COMPOSITION_GRADIENTS = [
    "radial-gradient(58% 52% at 24% 22%, rgba(240,240,245,0.15) 0%, rgba(240,240,245,0) 68%)",
    "radial-gradient(48% 42% at 60% 30%, rgba(215,213,233,0.11) 0%, rgba(215,213,233,0) 72%)",
    "radial-gradient(72% 58% at 36% 86%, rgba(240,240,245,0.065) 0%, rgba(240,240,245,0) 78%)",
    "radial-gradient(120% 110% at 50% 45%, rgba(240,240,245,0.03) 0%, rgba(240,240,245,0) 100%)",
].join(", ");

// ARCHITECT: центр виньетки сдвинут вместе с композицией — края уходят в темноту.
const VIGNETTE = "radial-gradient(125% 100% at 38% 30%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 100%)";

const PARALLAX_AMPLITUDE_PX = 12;
// ARCHITECT: слой меша шире вьюпорта на -inset-4, чтобы сдвиг параллакса не оголял края.
// Бюджет пикселей считается по реальному размеру слоя, иначе потолок DPR не достигается.
const PARALLAX_INSET_PX = 16;
const PARALLAX_SPRING = { stiffness: 40, damping: 22, mass: 0.9 };

export function AmbientBackground({ className, intensity = 1 }: AmbientBackgroundProps) {
    const reduceMotion = useReducedMotion();
    const [budget, setBudget] = useState<ViewportBudget | null>(null);
    const isShaderEnabled = budget !== null;
    const parallaxX = useSpring(0, PARALLAX_SPRING);
    const parallaxY = useSpring(0, PARALLAX_SPRING);

    useEffect(() => {
        if (reduceMotion === true || !supportsWebGl2()) return;
        return scheduleIdle(() => setBudget(computeViewportBudget(PARALLAX_INSET_PX)));
    }, [reduceMotion]);

    useEffect(() => {
        if (!isShaderEnabled) return;
        let frameId = 0;
        const handleResize = (): void => {
            if (frameId !== 0) return;
            frameId = window.requestAnimationFrame(() => {
                frameId = 0;
                setBudget(computeViewportBudget(PARALLAX_INSET_PX));
            });
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            if (frameId !== 0) window.cancelAnimationFrame(frameId);
        };
    }, [isShaderEnabled]);

    useEffect(() => {
        if (reduceMotion === true || !isShaderEnabled) return;
        if (!window.matchMedia("(pointer: fine)").matches) return;
        const handlePointerMove = (event: PointerEvent): void => {
            parallaxX.set((event.clientX / window.innerWidth - 0.5) * -2 * PARALLAX_AMPLITUDE_PX);
            parallaxY.set((event.clientY / window.innerHeight - 0.5) * -2 * PARALLAX_AMPLITUDE_PX);
        };
        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        return () => window.removeEventListener("pointermove", handlePointerMove);
    }, [reduceMotion, isShaderEnabled, parallaxX, parallaxY]);

    return (
        <div
            className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-black", className)}
            aria-hidden="true"
        >
            <div className="absolute inset-0" style={{ opacity: intensity }}>
                <div className="absolute inset-0" style={{ background: COMPOSITION_GRADIENTS }} />

                {budget !== null && (
                    <motion.div className="absolute -inset-4" style={{ x: parallaxX, y: parallaxY }}>
                        <Suspense fallback={null}>
                            <AmbientMeshField
                                maxPixelCount={budget.maxPixelCount}
                                minPixelRatio={budget.minPixelRatio}
                                speed={budget.speed}
                            />
                        </Suspense>
                    </motion.div>
                )}
            </div>

            <div className="absolute inset-0" style={{ background: VIGNETTE }} />
        </div>
    );
}
