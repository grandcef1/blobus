// ARCHITECT: примитив берётся из зонтичного пакета radix-ui — так же, как в dialog.tsx и
// sheet.tsx: единый источник Radix по всему проекту вместо десятка точечных зависимостей.

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                // ARCHITECT: flex-layout с gap нужен, чтобы чекбокс или radio вставлялся
                // внутрь подписи без ручных отступов; peer-селекторы глушат label у
                // выключенного контрола.
                "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                className
            )}
            {...props}
        />
    );
}

export { Label };