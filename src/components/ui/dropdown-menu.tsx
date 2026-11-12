// ARCHITECT: обёртки Radix DropdownMenu — единый вид выпадающих меню приложения: панель на
// ступень светлее фона, блюр только на оверлее, пункт не ниже 44px на телефоне. Клавиатура,
// ARIA, подменю и возврат фокуса на триггер — из Radix, здесь только стили.
// ARCHITECT: destructive — красный текст без заливки: цвет отмечает необратимое действие, а не
// украшает пункт (правило палитры про тонкий акцент вместо яркой плашки).
// ARCHITECT: у SubTrigger свой набор пропсов (onSelect — обычный React-обработчик, а не
// Radix-событие пункта), поэтому тип отдельный, а не общий с пунктом.

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTENT_CLASS = "z-50 min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-[#141416] p-1 text-[#f0f0f5] backdrop-blur-md";
const ITEM_CLASS = "relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-lg px-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 md:min-h-8";

type MenuTone = "default" | "destructive";

const ITEM_TONE: Record<MenuTone, string> = {
    default: "text-[#f0f0f5]/70 data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-[#f0f0f5]",
    destructive: "text-red-400 data-[highlighted]:bg-red-400/10 data-[highlighted]:text-red-300",
};

interface MenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
    variant?: MenuTone;
}

interface MenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
    variant?: MenuTone;
}

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
    return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                collisionPadding={8}
                className={cn(CONTENT_CLASS, className)}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

function DropdownMenuItem({ className, variant = "default", ...props }: MenuItemProps) {
    return (
        <DropdownMenuPrimitive.Item
            data-slot="dropdown-menu-item"
            className={cn(ITEM_CLASS, ITEM_TONE[variant], className)}
            {...props}
        />
    );
}

function DropdownMenuSub(props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
    return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({ className, variant = "default", children, ...props }: MenuSubTriggerProps) {
    return (
        <DropdownMenuPrimitive.SubTrigger
            data-slot="dropdown-menu-sub-trigger"
            className={cn(ITEM_CLASS, ITEM_TONE[variant], "justify-between data-[state=open]:bg-white/[0.06]", className)}
            {...props}
        >
            {children}
            <ChevronRight className="size-4 shrink-0 text-[#f0f0f5]/40" aria-hidden="true" />
        </DropdownMenuPrimitive.SubTrigger>
    );
}

// ARCHITECT: подменю порталится отдельно от главного меню: Content прокручивается (max-height +
// overflow-y-auto для длинных списков) и обрезал вложенный блок своей границей — раньше так и
// было. Свой портал снимает зависимость от overflow, collisionPadding удерживает у вьюпорта.
function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
    return (
        <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.SubContent
                data-slot="dropdown-menu-sub-content"
                sideOffset={4} alignOffset={-4} collisionPadding={8}
                className={cn(CONTENT_CLASS, "max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height,60vh))] overflow-y-auto thin-scroll", className)}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

function DropdownMenuRadioGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
    return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
    return (
        <DropdownMenuPrimitive.RadioItem
            data-slot="dropdown-menu-radio-item"
            className={cn(ITEM_CLASS, ITEM_TONE.default, "pl-8", className)}
            {...props}
        >
            <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
                <DropdownMenuPrimitive.ItemIndicator>
                    <Circle className="size-2 fill-current" aria-hidden="true" />
                </DropdownMenuPrimitive.ItemIndicator>
            </span>
            {children}
        </DropdownMenuPrimitive.RadioItem>
    );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
    return (
        <DropdownMenuPrimitive.Label
            data-slot="dropdown-menu-label"
            className={cn("px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#f0f0f5]/30", className)}
            {...props}
        />
    );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
    return (
        <DropdownMenuPrimitive.Separator
            data-slot="dropdown-menu-separator"
            className={cn("my-1 h-px bg-white/5", className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
};
