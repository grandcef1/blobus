// ARCHITECT: оболочка рельсы — каркас для широких экранов: фиксированная ширина, фон, граница
// и ручка сворачивания. Тело (SidebarBody) переиспользуется в мобильном drawer, поэтому
// разметка пунктов существует в одном месте. Высота h-dvh вместо h-screen: адресная строка
// мобильных браузеров не должна тянуть за собой layout.
// ARCHITECT: overflow-hidden переехал с рельсы на тело (SidebarBody). Он нужен только раскладке
// (шапка, кнопка, разделы и карточка профиля держат высоту, листается один список сессий), а на
// самой рельсе он срезал выступающую половину ручки сворачивания: ручка стоит по центру правой
// кромки, и её половина обязана выходить за границу — это и обрезалось.
// ARCHITECT: ручка перенесена в вертикальный центр рельсы: у верхней кромки (top-20) она
// читалась как часть шапки, а не как орган управления рельсой.

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarBody } from "./SidebarBody";
import { SIDEBAR_FOCUS_RING } from "./navigation";

export const SIDEBAR_WIDTH_EXPANDED = 280;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed left-0 top-0 z-40 hidden h-dvh flex-col border-r border-white/5 bg-[#0d0d0d] md:flex"
        >
            <SidebarBody isCollapsed={isCollapsed} />

            {/* ARCHITECT: 32px вместо 24px и поднятый фон #141416 против #0d0d0d: ручка живёт
                на кромке в чёрном поле контента и должна читаться как орган управления, а не как
                случайная точка. -right-4 при size-8 ставит её ровно на середину границы. */}
            <button
                type="button"
                onClick={onToggle}
                aria-label={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
                className={cn(
                    "absolute -right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#141416] text-[#f0f0f5]/60 transition-colors hover:border-white/25 hover:text-[#f0f0f5]",
                    SIDEBAR_FOCUS_RING
                )}
            >
                {isCollapsed ? (
                    <ChevronRight className="size-4" aria-hidden="true" />
                ) : (
                    <ChevronLeft className="size-4" aria-hidden="true" />
                )}
            </button>
        </motion.aside>
    );
}

