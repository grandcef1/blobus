// src/components/landing/TypewriterHeading.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// ARCHITECT: Компонент вынесен наружу для корректной работы хуков и анимаций
const Cursor = () => (
    <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        className="inline-block w-[3px] h-[0.85em] bg-[#d7d5e9] align-middle ml-1 rounded-full"
    />
);

export function TypewriterHeading() {
    const line1 = "Учи английский";
    const line2 = "с ИИ-репетитором";

    const [text1, setText1] = useState("");
    const [text2, setText2] = useState("");
    const [phase, setPhase] = useState<1 | 2 | 3>(1);

    useEffect(() => {
        if (phase === 1) {
            let i = 0;
            const timer = setInterval(() => {
                i++;
                setText1(line1.slice(0, i));
                if (i >= line1.length) {
                    clearInterval(timer);
                    setPhase(2);
                }
            }, 60);
            return () => clearInterval(timer);
        }

        if (phase === 2) {
            let i = 0;
            const timer = setInterval(() => {
                i++;
                setText2(line2.slice(0, i));
                if (i >= line2.length) {
                    clearInterval(timer);
                    setPhase(3);
                }
            }, 60);
            return () => clearInterval(timer);
        }
    }, [phase, line1, line2]);

    return (
        // ARCHITECT: 
        // 1. md:text-4xl (вместо 5xl) — критически важно, чтобы текст влезал в колонку на ноутбуках.
        // 2. whitespace-nowrap на втором div — железобетонный запрет на разрыв строки внутри фразы.
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-balance text-[#f0f0f5] leading-tight tracking-tight">
            
            <div className="min-h-[1.2em]">
                {text1}
                {phase === 1 && <Cursor />}
            </div>
            
            <div className="min-h-[1.2em] whitespace-nowrap">
                {text2}
                {phase === 2 && <Cursor />}
            </div>

        </h1>
    );
}
