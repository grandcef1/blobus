// ARCHITECT: минималистичный кроппер: круглое окно, панорамирование перетаскиванием и зум-слайдер. Модель
// кропа одна — computeCropRect из lib/avatarImage, поэтому превью рисует ровно ту рамку, что уйдёт в canvas,
// и «вижу одно, получаю другое» невозможно. Новых зависимостей нет: pointer events, input range, canvas.

import { useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, RotateCcw, X } from "lucide-react";

import { clampOffset, computeCropRect, renderCroppedAvatar } from "@/lib/avatarImage";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

interface AvatarCropEditorProps {
    readonly image: HTMLImageElement;
    readonly applying: boolean;
    readonly onApply: (dataUrl: string) => void;
    readonly onCancel: () => void;
}

/** Сторона окна кропа в CSS-пикселях: обязана совпадать с size-[256px] контейнера превью. */
const VIEWPORT = 256;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.01;
// ARCHITECT: шаг стрелок в CSS-пикселях: 8 — точная подстройка, 24 с Shift — быстрый перенос кадра.
const PAN_STEP = 8;
const PAN_STEP_FAST = 24;
const ARROW_DELTAS: Record<string, { readonly x: number; readonly y: number } | undefined> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};
const ICON = "size-4";
const ICON_BUTTON =
    "flex size-11 shrink-0 items-center justify-center rounded-lg text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5]/80 disabled:opacity-50";

export function AvatarCropEditor({ image, applying, onApply, onCancel }: AvatarCropEditorProps) {
    const { t } = useTranslation("dashboard");
    const [zoom, setZoom] = useState(ZOOM_MIN);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragStart = useRef<{ readonly x: number; readonly y: number } | null>(null);

    const transform = { viewport: VIEWPORT, zoom, offsetX: offset.x, offsetY: offset.y };
    const rect = computeCropRect(image, transform);

    const reset = (): void => {
        setZoom(ZOOM_MIN);
        setOffset({ x: 0, y: 0 });
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
        dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
        const start = dragStart.current;

        if (start === null) return;

        // ARCHITECT: смещение клампится той же функцией, что проверяют тесты: за краем окна полос не бывает.
        setOffset(
            clampOffset(image, {
                ...transform,
                offsetX: event.clientX - start.x,
                offsetY: event.clientY - start.y,
            })
        );
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
        dragStart.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const handleZoom = (next: number): void => {
        // ARCHITECT: допустимый вылет границ зависит от масштаба, поэтому смещение пересчитывается после зума.
        setOffset(clampOffset(image, { ...transform, zoom: next }));
        setZoom(next);
    };

    // ARCHITECT: стрелки двигают кадр так же, как перетаскивание: та же модель кропа и тот же кламп, поэтому
    // клавиатура и мышь дают один результат. preventDefault гасит прокрутку страницы.
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
        const delta = ARROW_DELTAS[event.key];

        if (delta === undefined) return;

        event.preventDefault();

        const step = event.shiftKey ? PAN_STEP_FAST : PAN_STEP;

        setOffset(
            clampOffset(image, {
                ...transform,
                offsetX: offset.x + delta.x * step,
                offsetY: offset.y + delta.y * step,
            })
        );
    };

    const handleApply = (): void => {
        try {
            onApply(renderCroppedAvatar(image, transform));
        } catch {
            // ARCHITECT: сбой рендера без canvas — тот же тост, что у прочих сбоев файла, без деталей наружу.
            toast.error(t("profile.avatar.invalid"));
        }
    };

    return (
        <div className="mt-5 flex flex-col gap-4">
            <div
                tabIndex={0}
                aria-label={t("profile.avatar.crop.hint")}
                className={cn(
                    "relative mx-auto size-[256px] cursor-grab touch-none overflow-hidden rounded-full bg-[#1a1a1c] active:cursor-grabbing",
                    FOCUS_RING
                )}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <img
                    src={image.src}
                    alt=""
                    draggable={false}
                    // ARCHITECT: геометрия зависит от зума и перетаскивания — утилитами Tailwind её не задать,
                    // как в ProgressBar и progress.tsx.
                    style={{
                        width: image.width * rect.displayScale,
                        height: image.height * rect.displayScale,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                        // ARCHITECT: transition у картинки нет: смещение меняется прямо в pointermove, а
                        // плавность даёт сам браузер через will-change.
                        willChange: "transform",
                    }}
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                />
            </div>

            <p className="text-center text-xs text-[#f0f0f5]/50">{t("profile.avatar.crop.hint")}</p>

            <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={zoom}
                aria-label={t("profile.avatar.crop.zoom")}
                onChange={(event) => handleZoom(Number(event.target.value))}
                className="w-full accent-[#f0f0f5]"
            />

            <div className="flex items-center justify-center gap-2">
                <button
                    type="button"
                    disabled={applying}
                    onClick={reset}
                    aria-label={t("profile.avatar.crop.reset")}
                    className={cn(ICON_BUTTON, FOCUS_RING)}
                >
                    <RotateCcw className={ICON} strokeWidth={1.5} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    disabled={applying}
                    onClick={onCancel}
                    aria-label={t("profile.avatar.crop.cancel")}
                    className={cn(ICON_BUTTON, FOCUS_RING)}
                >
                    <X className={ICON} strokeWidth={1.5} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    disabled={applying}
                    aria-busy={applying}
                    onClick={handleApply}
                    aria-label={t("profile.avatar.crop.apply")}
                    className={cn(ICON_BUTTON, FOCUS_RING)}
                >
                    {applying ? (
                        <Loader2 className={cn(ICON, "animate-spin")} aria-hidden="true" />
                    ) : (
                        <Check className={ICON} strokeWidth={1.5} aria-hidden="true" />
                    )}
                </button>
            </div>
        </div>
    );
}
