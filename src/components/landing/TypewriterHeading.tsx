// src/components/landing/TypewriterHeading.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation("landing");
    const line1 = t("hero.titleLine1");
    const line2 = t("hero.titleLine2");

    const [text1, setText1] = useState("");
    const [text2, setText2] = useState("");
    const [phase, setPhase] = useState<1 | 2 | 3>(1);
    const [source, setSource] = useState({ line1, line2 });

    // ARCHITECT: смена языка перезапускает печать: иначе на экране остался бы прежний заголовок, а
    // анимация продолжила бы печатать строку на другом языке. Сброс идёт на рендере, как в DemoDialog:
    // правило react-hooks/set-state-in-effect запрещает setState в теле эффекта.
    if (source.line1 !== line1 || source.line2 !== line2) {
        setSource({ line1, line2 });
        setText1("");
        setText2("");
        setPhase(1);
    }

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
        // ARCHITECT: на узких экранах кегль ниже (text-[2rem] до 360 px), иначе вторая строка с whitespace-nowrap
        // вылезает за overflow-x-clip; перенос строки не годится — при наборе он прыгал бы и дёргал раскладку.
        // ARCHITECT: кегль согласован с заголовками остальных секций (самый крупный мобильный h2 — text-4xl у
        // features), поэтому от 360 px стоит text-4xl: ступенька вместо общего уменьшения, nowrap сохранён из-за reflow.
        // ARCHITECT: каждая строка заголовка — отдельный однострочный блок, поэтому justify требует
        // [text-align-last:justify]: обычный justify последнюю строку блока не растягивает.
        // ARCHITECT: строка из одного слова не растянется физически — пробелов нет, растягивать нечего (CSS).
        <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-[#f0f0f5] min-[360px]:text-4xl sm:text-4xl lg:text-5xl xl:text-6xl">
            <div className="min-h-[1.2em] text-justify [text-align-last:justify] md:text-left md:[text-align-last:auto]">
                {text1}
                {phase === 1 && <Cursor />}
            </div>

            <div className="min-h-[1.2em] whitespace-nowrap text-justify [text-align-last:justify] md:text-left md:[text-align-last:auto]">
                {text2}
                {phase === 2 && <Cursor />}
            </div>
        </h1>
    );
}