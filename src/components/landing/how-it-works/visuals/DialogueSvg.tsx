import { motion } from "framer-motion";

export function DialogueSvg() {
    return (
        <svg viewBox="0 0 200 200" className="size-40 md:size-56" aria-hidden="true">
            {/* ARCHITECT: кривая пунктирная линия (позади). 
                Идёт от правого края верхнего пузыря (110, 83) к индикатору нижнего (102, 123). */}
            <motion.path
                d="M 110 83 Q 130 103 102 123"
                fill="none"
                stroke="#f0f0f5"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeLinecap="round"
                className="opacity-30"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Баббл ИИ (слева/сверху) с точками печатания */}
            <motion.g
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <rect
                    x="35" y="65" width="75" height="36" rx="10"
                    fill="#f0f0f5"
                    className="opacity-60"
                />
                <motion.circle cx="55" cy="83" r="2" fill="#000" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} />
                <motion.circle cx="65" cy="83" r="2" fill="#000" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
                <motion.circle cx="75" cy="83" r="2" fill="#000" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
            </motion.g>

            {/* Баббл Пользователя (справа/снизу) + индикатор */}
            <motion.g
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
                <rect
                    x="90" y="105" width="75" height="36" rx="10"
                    fill="#f0f0f5"
                    className="opacity-50"
                />
                
                {/* ARCHITECT: индикатор сдвинут на cx=102 (отступ 12px от левой границы пузыря x=90).
                    Состоит из статичного ядра и пульсирующего внешнего кольца (glow effect). */}
                <circle cx="102" cy="123" r="2.5" fill="#f0f0f5" />
                <motion.circle 
                    cx="102" cy="123" r="5" fill="#f0f0f5"
                    animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.3, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: "102px 123px" }}
                />
            </motion.g>
        </svg>
    );
}