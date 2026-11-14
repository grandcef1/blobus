// ARCHITECT: верхний бейдж hero — статусная надпись, а не ссылка. Она обозначает позиционирование
// продукта и не уводит со страницы, поэтому семантика — <div>, без href и без клика. Ультра-
// минимализм: никаких рамок, подложек и hover-состояний — остаётся только типографика и иконка,
// поэтому бейдж читается как человечная подпись, а не как «кнопка-чип» шаблонного AI-стартапа.
// Иконка спокойная и предметная (язык/книга) вместо «магической» Sparkles. Анимация появления
// живёт здесь, рядом с палитрой, — HeroSection только подставляет текст.

import { motion } from "framer-motion";
import { Languages } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface HeroBadgeProps {
    /** Текст бейджа в обычном регистре (Sentence case). */
    label: string;
    /** Иконка-акцент из lucide-react. По умолчанию — Languages. */
    icon?: LucideIcon;
    className?: string;
}

// ARCHITECT: чистый текст без контейнера. text-sm сохраняет читаемый размер (не жертвуем
// legibility ради «мелкого» вида), font-medium держит спокойный вес, text-white/80 даёт мягкий
// контраст. Без uppercase и tracking — они делали бейдж «маркетинговым». Без border/bg/hover:
// менять при наведении нечего, поэтому и transition-colors не нужен.
const BADGE_CLASSES = "inline-flex w-fit items-center gap-2 text-sm font-medium text-white/80";

export function HeroBadge({ label, icon: Icon = Languages, className }: HeroBadgeProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(BADGE_CLASSES, className)}
        >
            <Icon className="size-4 text-white/50" aria-hidden="true" />
            <span>{label}</span>
        </motion.div>
    );
}
