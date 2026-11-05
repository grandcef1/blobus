import { useEffect } from "react";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";

import { cn } from "@/lib/utils";

export interface BrandBlobatarProps {
    className?: string;
}

const BRAND_TRAITS: Record<string, number | number[]> = {
    shape: 0.35,
    "body.r": 0.456,
    "body.ratio": 0,
    "body.n": 0.999,
    "eye.rx": 0.969,
    "eye.ratio": 0.164,
    "eye.n": 0.232,
    "eye.gap": 0.306,
    "eye.lean": 0.437,
    "gaze.x": 0.725,
    "gaze.y": 0.378,
    tone: [0.1, 0.28],
    hue: 0.808,
};

export function BrandBlobatar({ className }: BrandBlobatarProps) {
    const { ref, lookAt } = useGaze({ travel: 15 });

    // Заставляем глаза следить за курсором — ровно один раз при монтировании.
    useEffect(() => {
        lookAt("pointer");
    }, [lookAt]);

    return (
        // ARCHITECT: пропорциональное масштабирование вместо фиксированных 800px (w-200),
        // которые и были главным источником горизонтального скролла на мобильных.
        <div
            className={cn(
                "aspect-square w-64 max-w-full shrink-0 sm:w-72 md:w-80 lg:w-96 xl:w-[28rem]",
                className,
            )}
        >
            <Blobatar
                ref={ref}
                animate="always"
                name="gabriel80"
                traits={BRAND_TRAITS}
            />
        </div>
    );
}
