// src/components/landing/pricing/visuals/ProCardSvg.tsx
// ARCHITECT: минималистичная молния — символ скорости, безлимита и премиума.
// ARCHITECT: анимация: молния "зажигается" с эффектом свечения.

import { motion } from "framer-motion";

export function ProCardSvg() {
    return (
        <svg viewBox="0 0 120 120" className="size-20 md:size-24" aria-hidden="true">
            {/* ARCHITECT: фоновое свечение молнии */}
            <motion.path
                d="M 65 25 L 45 65 L 60 65 L 55 95 L 80 50 L 65 50 Z"
                fill="#f0f0f5"
                className="opacity-10 blur-xl"
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* ARCHITECT: сама молния — рисуется через pathLength */}
            <motion.path
                d="M 65 25 L 45 65 L 60 65 L 55 95 L 80 50 L 65 50 Z"
                fill="#f0f0f5"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
        </svg>
    );
}