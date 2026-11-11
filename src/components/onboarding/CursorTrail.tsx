// ARCHITECT: след курсора — звёздная пыль: светящиеся точки разного размера
// с мягким гало (box-shadow в два слоя). Часть частиц слегка размыта ([filter:blur])
// для глубины — как искры вне фокуса. Без текстовых символов.
// Дрейф: вверх + случайное отклонение по x. Лимит 20 частиц.
// Только точные указатели (useSyncExternalStore), prefers-reduced-motion отключает.

import { useSyncExternalStore, useEffect, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Particle {
    id: number;
    x: number;
    y: number;
    sizeClass: string;
    driftX: number;
    blurred: boolean;
}

// Три фиксированных размера через классы Tailwind — без inline-стилей
const SIZE_CLASSES = ["size-1", "size-1.5", "size-2"] as const;
const MAX_PARTICLES = 20;
const PARTICLE_LIFETIME = 1100;
const POINTER_MEDIA_QUERY = "(pointer: fine)";

function subscribeToFinePointer(callback: () => void): () => void {
    const mediaQuery = window.matchMedia(POINTER_MEDIA_QUERY);
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
}

function getFinePointerSnapshot(): boolean {
    return window.matchMedia(POINTER_MEDIA_QUERY).matches;
}

function getFinePointerServerSnapshot(): boolean {
    return true;
}

export function CursorTrail() {
    const isFinePointer = useSyncExternalStore(
        subscribeToFinePointer,
        getFinePointerSnapshot,
        getFinePointerServerSnapshot
    );
    const [particles, setParticles] = useState<Particle[]>([]);
    const reduceMotion = useReducedMotion();

    const addParticle = useCallback(
        (x: number, y: number) => {
            if (reduceMotion || !isFinePointer) return;

            const newParticle: Particle = {
                id: Date.now() + Math.random(),
                x,
                y,
                sizeClass: SIZE_CLASSES[Math.floor(Math.random() * SIZE_CLASSES.length)],
                driftX: Math.round(Math.random() * 24 - 12),
                blurred: Math.random() < 0.35,
            };

            setParticles((prev) => [...prev, newParticle].slice(-MAX_PARTICLES));

            window.setTimeout(() => {
                setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
            }, PARTICLE_LIFETIME);
        },
        [reduceMotion, isFinePointer]
    );

    useEffect(() => {
        if (!isFinePointer || reduceMotion) return;

        let lastTime = 0;
        const THROTTLE = 60;

        const handleMove = (event: PointerEvent) => {
            const now = Date.now();
            if (now - lastTime < THROTTLE) return;
            lastTime = now;
            addParticle(event.clientX, event.clientY);
        };

        window.addEventListener("pointermove", handleMove);
        return () => window.removeEventListener("pointermove", handleMove);
    }, [isFinePointer, reduceMotion, addParticle]);

    if (!isFinePointer || reduceMotion) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
            {particles.map((particle) => (
                <motion.span
                    key={particle.id}
                    initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
                    animate={{ opacity: 0, scale: 0.3, x: particle.driftX, y: -26 }}
                    transition={{ duration: PARTICLE_LIFETIME / 1000, ease: "easeOut" }}
                    className={cn(
                        "absolute rounded-full bg-[#f0f0f5]",
                        "[box-shadow:0_0_8px_rgba(240,240,245,0.7),0_0_20px_rgba(240,240,245,0.3)]",
                        particle.sizeClass,
                        particle.blurred && "[filter:blur(1px)]"
                    )}
                    style={{ left: particle.x, top: particle.y }}
                />
            ))}
        </div>
    );
}