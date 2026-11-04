// src/components/landing/pricing/visuals/FreeCardSvg.tsx
// ARCHITECT: минималистичный открытый замок — символ доступности и бесплатного входа.
// ARCHITECT: анимация: дужка замка приподнимается и опускается (открытие/закрытие).

import { motion } from "framer-motion";

export function FreeCardSvg() {
    return (
        <svg viewBox="0 0 120 120" className="size-20 md:size-24" aria-hidden="true">
            {/* ARCHITECT: дужка замка — анимируется открытие/закрытие */}
            <motion.path
                d="M 40 55 L 40 40 C 40 28, 48 20, 60 20 C 72 20, 80 28, 80 40 L 80 55"
                fill="none"
                stroke="#f0f0f5"
                strokeWidth="3"
                strokeLinecap="round"
                animate={{ 
                    d: [
                        "M 40 55 L 40 40 C 40 28, 48 20, 60 20 C 72 20, 80 28, 80 40 L 80 55",
                        "M 40 55 L 40 35 C 40 23, 48 15, 60 15 C 72 15, 80 23, 80 35 L 80 45",
                        "M 40 55 L 40 40 C 40 28, 48 20, 60 20 C 72 20, 80 28, 80 40 L 80 55",
                    ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* ARCHITECT: корпус замка */}
            <rect
                x="35" y="55" width="50" height="40" rx="6"
                fill="none"
                stroke="#f0f0f5"
                strokeWidth="3"
                className="opacity-80"
            />
            
            {/* ARCHITECT: замочная скважина — пульсирует */}
            <motion.circle
                cx="60" cy="75" r="4"
                fill="#f0f0f5"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    );
}