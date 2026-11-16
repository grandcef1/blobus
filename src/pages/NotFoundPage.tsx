// ARCHITECT: 404 — это экран пустого состояния, а не витрина. Иллюстраций и декоративных пятен
// здесь нет: rules 3.5 и 12 запрещают светящиеся шары и цветной blur, поэтому глубина сделана
// одной очень слабой радиальной подсветкой на фоне страницы — ровно такой градиент правила
// разрешают, и он статичен (никакого pulse/float: движение здесь несло бы только шум).
// ARCHITECT: у Mori в проекте одно начертание (400), поэтому font-extralight/font-thin не дали бы
// тонкого рисунка — элегантность собрана из размера, трекинга и воздуха. Вес указан явно, чтобы
// решение было видно в коде, а не читалось как пропуск.
// ARCHITECT: появление — тот же приём, что в HeroSection: контейнер со staggerChildren и гейт
// useReducedMotion. При системном reduced-motion текст просто встаёт на место без движения.

import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/shared/Seo";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const CONTAINER: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const REVEAL: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

// ARCHITECT: цифра — единственный display-элемент экрана, и её размер выше самой крупной ступени
// шкалы (text-9xl), поэтому он задан значением в скобках. Три шага держат её доминирующей и на
// телефоне, и на десктопе, но не выталкивают текст за вьюпорт шириной 360px.
const NUMBER = "text-[8rem] leading-none tracking-tight tabular-nums sm:text-[11rem] lg:text-[15rem]";

// ARCHITECT: вторичная кнопка собрана как второй CTA лендинга (HeroSection): прозрачный фон,
// тонкая светлая граница, hover-заливка 10%. h-11 — планка касания 44px, FOCUS_RING — видимый
// фокус: токены shadcn (ring-ring, bg-background) в проекте не определены в index.css.
const HOME_LINK = cn(
    "h-11 rounded-full border border-[#f0f0f5]/30 bg-transparent px-6 text-[#f0f0f5] shadow-none",
    "transition-colors hover:border-[#f0f0f5]/50 hover:bg-[#f0f0f5]/10 hover:text-[#f0f0f5]",
    FOCUS_RING
);

export function NotFoundPage() {
    const shouldReduceMotion = useReducedMotion();

    // ARCHITECT: soft-404 SPA гасится noindex: любой неизвестный путь внутри приложения отдаётся
    // одним и тем же index.html, и без этой метки поисковик считал бы его копией лендинга.
    return (
        <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
            <Seo indexable={false} title="Страница не найдена" />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(240,240,245,0.05),transparent_65%)]"
            />

            <motion.div
                className="relative flex flex-col items-center"
                variants={CONTAINER}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
            >
                <motion.span
                    variants={REVEAL}
                    aria-hidden="true"
                    className={cn(NUMBER, "font-normal select-none text-[#f0f0f5]")}
                >
                    404
                </motion.span>

                <motion.h1
                    variants={REVEAL}
                    className="mt-8 text-3xl font-normal tracking-tight text-[#f0f0f5] md:text-4xl"
                >
                    Маршрут не найден
                </motion.h1>

                <motion.p
                    variants={REVEAL}
                    className="mt-3 max-w-md text-base leading-relaxed text-[#f0f0f5]/60"
                >
                    Похоже, эта страница растворилась в пространстве. Вернёмся к обучению?
                </motion.p>

                <motion.div variants={REVEAL} className="mt-8">
                    <Button asChild variant="outline" size="lg" className={HOME_LINK}>
                        <Link to="/">
                            <ArrowLeft aria-hidden="true" />
                            Вернуться на главную
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </main>
    );
}