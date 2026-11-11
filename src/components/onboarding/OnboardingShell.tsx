// ARCHITECT: оболочка всего онбординга. Владеет постоянными слоями: фон, верхняя шторка
// и прогресс-бар. Монтируются один раз за сессию и не перемонтируются при смене шага —
// поэтому WebGL-контекст не пересоздаётся, а тон одинаков на всех шагах по конструкции,
// а не по копипасте классов в каждый шаг.
// ARCHITECT: стек по z: фон 0 -> шторка 10 -> контент 30 -> прогресс 50.
// ARCHITECT: фон подключается ровно тем же компонентом и с теми же пропсами, что были
// в welcome, — перенос один в один, вид welcome не меняется.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AmbientBackground } from "@/components/shared/AmbientBackground";

interface OnboardingShellProps {
    /** Прогресс 0..100 для верхней полосы. */
    progress: number;
    children: ReactNode;
}

export function OnboardingShell({ progress, children }: OnboardingShellProps) {
    return (
        <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-black">
            <AmbientBackground />

            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2/3 bg-gradient-to-b from-black via-black/30 to-transparent"
                aria-hidden="true"
            />

            <div className="fixed left-0 top-0 z-50 h-1 w-full bg-white/5">
                <motion.div
                    className="h-full bg-[#f0f0f5]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                />
            </div>

            <div className="relative z-30 flex flex-1 items-center justify-center">{children}</div>
        </div>
    );
}
