// ARCHITECT: первый экран. Блок с текстом и кнопкой — едва различимая
// стеклянная панель кастомной формы «лист»: асимметричные радиусы
// (2.5rem по диагонали, 1rem по другой) вместо скучного прямоугольника.
// Блюр снижен до 2px — форма и тонкая граница держат контур, блюр не спорит с линиями.
// След курсора — звёздная пыль (CursorTrail), глобус статичный.

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CursorTrail } from "@/components/onboarding/CursorTrail";
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
            <CursorTrail />

            <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2/3 bg-gradient-to-b from-black via-black/60 to-transparent"
                aria-hidden="true"
            />

            <div className="relative z-20 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-24 text-center md:pt-28">
                <motion.p {...fadeUp(0)} className="text-xs text-[#f0f0f5]/50">
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
                    className="mt-[21px] rounded-[2.5rem_1rem_2.5rem_1rem] border border-white/5 bg-black/20 p-6 backdrop-blur-[5px]"
                >
                    <p className="mx-auto max-w-md text-base leading-relaxed text-[#f0f0f5]/70">
                        Репетитор подстраивается под твою цель и уровень: от повседневного
                        разговора до технического собеседования.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                        <Button
                            type="button"
                            onClick={onNext}
                            className="flex min-h-11 items-center gap-2 rounded-full bg-[#f0f0f5] px-6 text-sm font-medium text-black hover:bg-[#f0f0f5]/90"
                        >
                            Начать
                            <ArrowRight className="size-4" />
                        </Button>
                        <span className="text-xs text-[#f0f0f5]/50">5 шагов · около 10 минут</span>
                    </div>
                </motion.div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-0" aria-hidden="true">
                <WelcomeGlobe className="h-[max(30dvh,30vw)] w-full" />
            </div>
        </div>
    );
}