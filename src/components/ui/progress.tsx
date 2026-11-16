// ARCHITECT: обёртка Radix Progress. Монохром: дорожка — полупрозрачный слой, индикатор — основной
// текст продукта. aria-valuenow, aria-valuemin/max и разворот для RTL даёт Radix.
// ARCHITECT: сдвиг индикатора задаётся inline-стилем: значение приходит из props, а динамический
// класс Tailwind не попал бы в сборку — статический набор классов здесь невозможен.

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-white/10", className)}
            value={value}
            {...props}
        >
            <ProgressPrimitive.Indicator
                data-slot="progress-indicator"
                className="h-full w-full bg-[#f0f0f5] transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    );
}

export { Progress };
