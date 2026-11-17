// ARCHITECT: бренд-знак проекта. Это тот же блобатар, что в hero, но с двумя режимами:
// interactive (по умолчанию) следит за курсором, static — статичная мини-марка для шапки
// сайдбара и favicon. Геометрия и палитра заданы один раз в BRAND_TRAITS, поэтому hero,
// шапка сайдбара и иконка вкладки физически не могут разойтись.

import { useEffect } from "react";
import { Blobatar } from "@blobatar/react";
import { useGaze } from "@blobatar/react/gaze";

import { cn } from "@/lib/utils";

export interface BrandBlobatarProps {
    className?: string;
    /** false — статичная марка: без слежения за курсором и без анимации. */
    interactive?: boolean;
    /** false — живая idle-анимация без слежения за курсором: сайдбару нужна марка без реакции на курсор. */
    gaze?: boolean;
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

// ARCHITECT: убрали фиксированную ladder-ширину и max-w-full — размер определяет вызывающий
// через className (cn + tailwind-merge). Внутренности (traits, gaze) не тронуты.
const INTERACTIVE_SIZE = "aspect-square w-64 shrink-0 sm:w-80";
const STATIC_SIZE = "aspect-square size-7 shrink-0";

export function BrandBlobatar({ className, interactive = true, gaze = true }: BrandBlobatarProps) {
    const { ref, lookAt } = useGaze({ travel: 15 });

    // ARCHITECT: проп gaze разделяет idle-анимацию и слежение за курсором: сайдбару нужна живая
    // марка без реакции на курсор, лендингу — обе. Хук вызывается безусловно (условные хуки
    // запрещены), отключается только привязка слежения — ref не подключается к разметке.
    const tracksPointer = interactive && gaze;
    useEffect(() => {
        if (tracksPointer) lookAt("pointer");
    }, [tracksPointer, lookAt]);

    return (
        <div className={cn(interactive ? INTERACTIVE_SIZE : STATIC_SIZE, className)}>
            {interactive ? (
                tracksPointer ? (
                    <Blobatar ref={ref} animate="always" name="gabriel80" traits={BRAND_TRAITS} />
                ) : (
                    <Blobatar
                        animate="always"
                        name="gabriel80"
                        traits={BRAND_TRAITS}
                        className="size-full"
                    />
                )
            ) : (
                // ARCHITECT: статичная марка — это <img> с тем же силуэтом (два глаза и тело из
                // BRAND_TRAITS). `animate` не передаём вовсе: анимация в библиотеке opt-in, а
                // литерал `false` не проходит проверку типов, потому что BlobatarOptions.animate
                // пересекается с вариантом StaticProps и съедает `false`. Пустой alt помечает
                // знак как декоративный — рядом всегда стоит вордмарк Blobus.
                <Blobatar
                    name="gabriel80"
                    traits={BRAND_TRAITS}
                    className="size-full"
                    alt=""
                />
            )}
        </div>
    );
}
