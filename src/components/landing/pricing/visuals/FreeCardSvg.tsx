// src/components/landing/pricing/visuals/FreeCardSvg.tsx
// ARCHITECT: минималистичная SVG-декорация для Free карточки.
// ARCHITECT: абстрактный символ "открытых возможностей" — три плавающие точки с мягким свечением.

import { motion } from "framer-motion";

export function FreeCardSvg() {
    return (
        <svg viewBox="0 0 120 120" className="size-24 md:size-32" aria-hidden="true">
            {/* Центральная точка с пульсацией */}
            <motion.circle
                cx="60" cy="60" r="8"
                fill="#f0f0f5"
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "60px", originY: "60px" }}
            />
            
            {/* Орбитальные точки */}
            <motion.circle
                cx="60" cy="20" r="3"
                fill="#f0f0f5"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                style={{ originX: "60px", originY: "60px" }}
                className="opacity-60"
            />
            <motion.circle
                cx="100" cy="60" r="3"
                fill="#f0f0f5"
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{ originX: "60px", originY: "60px" }}
                className="opacity-40"
            />
            <motion.circle
                cx="60" cy="100" r="3"
                fill="#f0f0f5"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ originX: "60px", originY: "60px" }}
                className="opacity-30"
            />
        </svg>
    );
}