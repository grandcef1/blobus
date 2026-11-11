// ARCHITECT: первый экран. Блок с текстом и кнопкой — стеклянная панель кастомной формы
// «лист»: асимметричные радиусы (2.5rem по диагонали, 1rem по другой) вместо скучного
// прямоугольника. Поверхности берутся из lib/surfaces — это общий источник правды для
// всех шагов, поэтому карточка welcome и карточки остальных шагов совпадают по токенам.
// ARCHITECT: фон, верхняя шторка и прогресс переехали в OnboardingShell и монтируются
// один раз на всю сессию. Здесь остаётся только контент шага и глобус.

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GLASS_SURFACE, LEAF_RADIUS, EYEBROW, META_LINE, PRIMARY_BUTTON } from "@/lib/surfaces";
import { WelcomeGlobe } from "./WelcomeGlobe";

interface WelcomeStepProps {
    onNext: () => void;
}

const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay, ease: "easeOut" as const },
});

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden">
            <div className="relative z-20 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-24 text-center md:pt-28">
                <motion.p {...fadeUp(0)} className={EYEBROW}>
                    ИИ-репетитор английского
                </motion.p>

                <motion.h1
                    {...fadeUp(0.06)}
                    className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[#f0f0f5] md:text-5xl"
                >
                    Английский в диалоге, а не по учебнику
                </motion.h1>

                <motion.div
                    {...fadeUp(0.14)}
                    className={cn(GLASS_SURFACE, LEAF_RADIUS, "mt-[16px] p-6")}
                >
                    <p className="mx-auto max-w-md text-base leading-relaxed text-[#f0f0f5]/70">
                        Репетитор подстраивается под твою цель и уровень: от повседневного
                        разговора до технического собеседования.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                        <Button
                            type="button"
                            onClick={onNext}
                            className={PRIMARY_BUTTON}
                        >
                            Начать
                            <ArrowRight className="size-4" />
                        </Button>
                        <span className={META_LINE}>5 шагов · около 10 минут</span>
                    </div>
                </motion.div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-0" aria-hidden="true">
                <WelcomeGlobe className="h-[max(30dvh,30vw)] w-full" />
            </div>
        </div>
    );
}