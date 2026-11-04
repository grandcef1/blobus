import { motion } from "framer-motion";

export function GoalSvg() {
    return (
        <svg viewBox="0 0 200 200" className="size-40 md:size-56" aria-hidden="true">
            {/* Внешнее кольцо: медленное вращение */}
            <motion.circle
                cx="100" cy="100" r="70"
                fill="none" stroke="#f0f0f5" strokeWidth="0.5" strokeDasharray="4 4"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                style={{ originX: "100px", originY: "100px" }}
                className="opacity-20"
            />
            
            {/* Среднее кольцо: обратное вращение */}
            <motion.circle
                cx="100" cy="100" r="50"
                fill="none" stroke="#f0f0f5" strokeWidth="1"
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{ originX: "100px", originY: "100px" }}
                className="opacity-40"
            />
            
            {/* Ядро: мягкая пульсация */}
            <motion.circle
                cx="100" cy="100" r="14"
                fill="#f0f0f5"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ originX: "100px", originY: "100px" }}
                className="blur-[2px]"
            />
            
            {/* Орбитальная точка */}
            <motion.circle
                cx="100" cy="30" r="3"
                fill="#f0f0f5"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                style={{ originX: "100px", originY: "100px" }}
                className="opacity-80"
            />
        </svg>
    );
}