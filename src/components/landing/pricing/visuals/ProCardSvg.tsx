// src/components/landing/pricing/visuals/ProCardSvg.tsx
// ARCHITECT: премиальная SVG-декорация для Pro карточки.
// ARCHITECT: абстрактная "корона" из трех лучей с анимацией свечения и пульсации.

import { motion } from "framer-motion";

export function ProCardSvg() {
    return (
        <svg viewBox="0 0 120 120" className="size-24 md:size-32" aria-hidden="true">
            {/* Фоновое свечение */}
            <circle cx="60" cy="60" r="40" fill="#f0f0f5" className="opacity-[0.05] blur-2xl" />
            
            {/* Центральный луч */}
            <motion.path
                d="M 60 30 L 60 70"
                stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
            
            {/* Левый луч */}
            <motion.path
                d="M 60 50 L 35 75"
                stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: 0.3, ease: "easeInOut" }}
            />
            
            {/* Правый луч */}
            <motion.path
                d="M 60 50 L 85 75"
                stroke="#f0f0f5" strokeWidth="2" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: 0.6, ease: "easeInOut" }}
            />
            
            {/* Центральная точка */}
            <motion.circle
                cx="60" cy="30" r="4"
                fill="#f0f0f5"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "60px", originY: "30px" }}
            />
        </svg>
    );
}