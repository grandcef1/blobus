// ARCHITECT: мобильный drawer — существующий shadcn Sheet со стороной left. Focus-trap,
// закрытие по Escape и backdrop и блокировка скролла body приходят из Radix Dialog, свой не
// пишем; закрытие по смене маршрута держит AppLayout, где лежит состояние.
// ARCHITECT: ширина w-70 = 17.5rem = 280px совпадает с развёрнутой рельсой, поэтому тело
// сайдбара выглядит одинаково в обоих режимах. Фон и текст перекрываем утилитами: у Sheet
// светлая тема по умолчанию, а меню приложения всегда тёмное.

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarBody } from "./SidebarBody";

interface SidebarDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SidebarDrawer({ open, onOpenChange }: SidebarDrawerProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="left"
                aria-describedby={undefined}
                className="w-70 gap-0 border-r border-white/5 bg-[#0d0d0d] p-0 text-[#f0f0f5]"
            >
                <SheetTitle className="sr-only">Меню приложения</SheetTitle>
                <SidebarBody isCollapsed={false} />
            </SheetContent>
        </Sheet>
    );
}
