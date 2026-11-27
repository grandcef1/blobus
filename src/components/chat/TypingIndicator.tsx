// ARCHITECT: ожидание первого текста показывается тремя точками, а не пустым пузырём: пустая карточка читалась
// бы как сбой, а индикатор говорит «репетитор печатает» (§3.8 — индикатор конкретного действия).
// ARCHITECT: анимация нужна только этому состоянию загрузки; при prefers-reduced-motion точки стоят на месте,
// а текст для скринридера остаётся — движение отключается, смысл нет.

import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

const DOTS = [0, 1, 2] as const;
const DOT = "size-1.5 rounded-full bg-[#f0f0f5]/50";

export function TypingIndicator() {
    const { t } = useTranslation("chat");
    const shouldReduceMotion = useReducedMotion();

    return (
        <div role="status" aria-label={t("feed.typing")} className="flex items-center gap-1.5 py-3">
            {DOTS.map((dot) => (
                <motion.span
                    key={dot}
                    className={DOT}
                    animate={shouldReduceMotion ? undefined : { opacity: [0.25, 1, 0.25] }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}
