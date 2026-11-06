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
    const line1 = "Учи английский с";
    const line2 = "ИИ-репетитором";

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
        // ARCHITECT: кегль усилен на xl до 6xl (60px) — иерархия против блобатара.
        // leading-[1.08] — плотный, редакционный. whitespace-nowrap на второй
        // строке сохранён: CLS при typewriter недопустим.
        <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#f0f0f5] lg:text-5xl xl:text-6xl">
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