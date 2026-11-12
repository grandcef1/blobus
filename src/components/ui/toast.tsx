// ARCHITECT: обёртки Radix Toast. Тост — монохромная панель с тонким семантическим маркером:
// цвет отмечает статус, но не заливает поверхность. Панель живёт в оверлее, поэтому блюр уместен.
// Разметка, таймер и пауза при наведении — из Radix; здесь только вид.

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastVariant } from "@/store/toast";

const MARKER_TONE: Record<ToastVariant, string> = {
    success: "bg-green-400",
    error: "bg-red-400",
    info: "bg-blue-400",
};

interface ToastRootProps
    extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
    variant?: ToastVariant;
}

function ToastRoot({ variant = "info", className, children, ...props }: ToastRootProps) {
    return (
        <ToastPrimitive.Root
            data-slot="toast"
            className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#141416]/95 p-4 backdrop-blur-md",
                className
            )}
            {...props}
        >
            <span
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", MARKER_TONE[variant])}
                aria-hidden="true"
            />
            <div className="min-w-0 flex-1">{children}</div>
            <ToastPrimitive.Close
                aria-label="Закрыть"
                className="shrink-0 rounded-md p-1 text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
            >
                <X className="size-4" aria-hidden="true" />
            </ToastPrimitive.Close>
        </ToastPrimitive.Root>
    );
}

function ToastViewport({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
    return (
        <ToastPrimitive.Viewport
            data-slot="toast-viewport"
            className={cn(
                "fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none",
                className
            )}
            {...props}
        />
    );
}

function ToastTitle({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
    return (
        <ToastPrimitive.Title
            className={cn("text-sm font-medium text-[#f0f0f5]", className)}
            {...props}
        />
    );
}

function ToastDescription({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
    return (
        <ToastPrimitive.Description
            className={cn("mt-0.5 text-xs leading-relaxed text-[#f0f0f5]/50", className)}
            {...props}
        />
    );
}

export { ToastPrimitive, ToastRoot, ToastViewport, ToastTitle, ToastDescription };
