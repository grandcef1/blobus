// ARCHITECT: тяжёлая часть фона вынесена в отдельный модуль: AmbientBackground
// подтягивает её динамическим импортом, поэтому GLSL и WebGL-обвязка не попадают
// в основной бандл.
// ARCHITECT: меш усредняет цвета с весом 1/dist^3.5. Позиции пятен за полный цикл
// проходят весь uv-квадрат, поэтому в среднем поле выходит равномерным (проверено
// покадровой выборкой: центроид ровно 50%/50%). Значит, устойчивую асимметричную
// композицию меш дать не может — её держит статический слой AmbientBackground, а меш
// работает поверх как медленная органическая модуляция. Отсюда alpha < 1: он должен
// пропускать композицию через себя, а не перекрывать её.
// ARCHITECT: тона — производные палитры проекта: #262627 от #f0f0f5, #1d1d1f от #d7d5e9,
// #0d0d0d — существующий тёмный токен. При alpha 0.42 пик композита ~45/255, поэтому
// заголовок держит 12:1 над самой светлой зоной, а glow блобатара не глохнет.

import { MeshGradient } from "@paper-design/shaders-react";

interface AmbientMeshFieldProps {
    /** Потолок физических пикселей — держит DPR в бюджете слоя. */
    maxPixelCount: number;
    /** Масштаб рендера, совпадает с бюджетным DPR (1.5 десктоп, 1.25 мобильный). */
    minPixelRatio: number;
    /** Множитель скорости дрейфа; полный цикл пятна на 0.5 — от 21 до 42 секунд. */
    speed: number;
}

// ARCHITECT: стабильный модульный массив — memo-компаратор MeshGradient сравнивает
// цвета поэлементно, но новый литерал каждый рендер лишал бы мемо смысла.
const MESH_COLORS: string[] = ["#2626276b", "#1d1d1f6b", "#0d0d0d6b"];

export function AmbientMeshField({ maxPixelCount, minPixelRatio, speed }: AmbientMeshFieldProps) {
    return (
        <MeshGradient
            className="absolute inset-0 h-full w-full"
            colors={MESH_COLORS}
            speed={speed}
            fit="contain"
            scale={1.15}
            rotation={-10}
            offsetX={-0.17}
            offsetY={-0.08}
            distortion={0.85}
            swirl={0.22}
            grainMixer={0.15}
            grainOverlay={0.06}
            minPixelRatio={minPixelRatio}
            maxPixelCount={maxPixelCount}
        />
    );
}
