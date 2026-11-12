// ARCHITECT: обёртки Radix Dialog. Поверхность — приподнятая тёмная панель на затемнённом фоне,
// блюр уместен: это оверлей. Ловушка фокуса, Esc и возврат фокуса на триггер — из Radix.
// ARCHITECT: диалог всегда подписан: Title обязателен для скринридера, поэтому он входит в
// обязательную разметку компонента, а не остаётся на совести вызывающего.

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogContent({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
    return (
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
                data-slot="dialog-overlay"
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#141416] p-5 text-[#f0f0f5]",
                    className
                )}
                {...props}
            >
                {children}
                <DialogPrimitive.Close
                    aria-label="Закрыть"
                    className="absolute right-4 top-4 rounded-md p-1 text-[#f0f0f5]/40 transition-colors hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                >
                    <X className="size-4" aria-hidden="true" />
                </DialogPrimitive.Close>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    );
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("pr-8 text-base font-semibold text-[#f0f0f5]", className)}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("mt-2 text-sm leading-relaxed text-[#f0f0f5]/60", className)}
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn("mt-5 flex items-center justify-end gap-3", className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
};