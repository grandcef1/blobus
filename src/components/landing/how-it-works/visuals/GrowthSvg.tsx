import { motion } from "framer-motion";

export function GrowthSvg() {
    return (
        <svg viewBox="0 0 200 200" className="size-40 md:size-56" aria-hidden="true">
            {/* ARCHITECT: все элементы сдвинуты вниз ещё на 12px (итого +27px от оригинала).
                Теперь визуальный центр графика совпадает с центром текстового блока. */}
            
            {/* Плавная кривая роста */}
            <motion.path
                d="M 40 177 C 80 177, 80 117, 120 117 C 160 117, 160 67, 170 67"
                fill="none" stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />

            {/* Точки на ключевых этапах кривой */}
            <motion.circle
                cx="120" cy="117" r="4"
                fill="#f0f0f5"
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
                cx="170" cy="67" r="4"
                fill="#f0f0f5"
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
            />

            {/* Абстрактная горизонтальная ось */}
            <line
                x1="40" y1="177" x2="170" y2="177"
                stroke="#f0f0f5" strokeWidth="1" strokeDasharray="3 3"
                className="opacity-20"
            />
        </svg>
    );
}