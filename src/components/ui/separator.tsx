// ARCHITECT: примитив берётся из зонтичного пакета radix-ui — так же, как в dialog.tsx и
// sheet.tsx: единый источник Radix по всему проекту вместо десятка точечных зависимостей.

import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Separator({
    className,
    orientation = "horizontal",
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            data-slot="separator"
            decorative={orientation === "horizontal"}
            orientation={orientation}
            className={cn(
                // ARCHITECT: hairline white/10 вместо токена border: на чёрном фоне темы
                // именно полупрозрачная линия читается как премиальный разделитель.
                "shrink-0 bg-white/10 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
                className
            )}
            {...props}
        />
    );
}

export { Separator };