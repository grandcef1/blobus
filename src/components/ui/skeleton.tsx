// ARCHITECT: скелетон — функциональный лоадер, а не декорация: он показывает, что данные в пути, и
// повторяет раскладку экрана, поэтому контент встаёт на место без скачка. Пульсация одна на всё
// приложение, размеры задаёт вызывающая сторона классами.

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn("animate-pulse rounded bg-white/5", className)} aria-hidden="true" />;
}