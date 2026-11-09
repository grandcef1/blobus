// ARCHITECT: Приветственный шаг онбординга — переведён на русский

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
    onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                {/* Placeholder for Blobatar animation */}
                <div className="size-32 rounded-full bg-white/10" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs tracking-wide text-[#f0f0f5]/70">
                    <Sparkles className="size-3.5" />
                    <span>10 минут до старта</span>
                </div>

                <h1 className="mb-4 text-4xl font-bold tracking-tight text-[#f0f0f5] md:text-5xl">
                    Добро пожаловать в Blobus
                </h1>

                <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed text-[#f0f0f5]/60">
                    Твой персональный ИИ-репетитор английского. Давай всё настроим, чтобы
                    ты мог сразу начать учиться.
                </p>

                <Button
                    onClick={onNext}
                    className="group inline-flex items-center gap-2 rounded-full bg-[#f0f0f5] px-8 py-3 text-base font-medium text-black transition-transform hover:scale-[1.02]"
                >
                    Начать
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </motion.div>
        </div>
    );
}