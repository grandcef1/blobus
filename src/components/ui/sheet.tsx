// ARCHITECT: Sheet — мобильное меню на Radix Dialog (пакет radix-ui уже в зависимостях,
// новых пакетов не добавляем). API повторяет shadcn/ui Sheet, стили — строго чёрно-белая тема.
import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

export interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
    side?: SheetSide;
}

// ARCHITECT: в проекте нет tailwindcss-animate/tw-animate-css, поэтому переходы описаны
// через произвольные значения Tailwind v4 (data-state берётся из Radix).
const openCloseTransitions =
    "transition-all duration-300 ease-out data-[state=closed]:opacity-0";

const sideStyles: Record<SheetSide, string> = {
    top: cn(
        "inset-x-0 top-0 border-b data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
        openCloseTransitions,
    ),
    bottom: cn(
        "inset-x-0 bottom-0 border-t data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
        openCloseTransitions,
    ),
    left: cn(
        "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm",
        openCloseTransitions,
    ),
    right: cn(
        "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm",
        openCloseTransitions,
    ),
};

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(
    props: React.ComponentProps<typeof SheetPrimitive.Trigger>,
) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
    return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal(
    props: React.ComponentProps<typeof SheetPrimitive.Portal>,
) {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            data-slot="sheet-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300 data-[state=closed]:opacity-0",
                className,
            )}
            {...props}
        />
    );
}

function SheetContent({ className, children, side = "right", ...props }: SheetContentProps) {
    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                className={cn(
                    // ARCHITECT: фон панели — #fffce1, текст — чёрный (инверсия основной палитры), без градиентов
                    "fixed z-50 flex flex-col gap-4 bg-[#fffce1] text-black shadow-lg transition ease-in-out",
                    sideStyles[side],
                    className,
                )}
                {...props}
            >
                {children}
                <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:outline-none disabled:pointer-events-none">
                    <X className="size-5" aria-hidden="true" />
                    <span className="sr-only">Закрыть</span>
                </SheetPrimitive.Close>
            </SheetPrimitive.Content>
        </SheetPortal>
    );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sheet-header"
            className={cn("flex flex-col gap-1.5 p-6", className)}
            {...props}
        />
    );
}

function SheetTitle({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn("font-bold text-black", className)}
            {...props}
        />
    );
}

function SheetDescription({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
    return (
        <SheetPrimitive.Description
            data-slot="sheet-description"
            className={cn("text-sm text-black/60", className)}
            {...props}
        />
    );
}

export {
    Sheet,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
};
