// src/components/landing/MiniBlobatar.tsx
import { Blobatar } from "@blobatar/react";
import { motion } from "framer-motion";

export interface MiniBlobatarProps {
    name: string;
    traits: Record<string, number | number[]>;
}

export function MiniBlobatar({ name, traits }: MiniBlobatarProps) {
    return (
        <motion.div
            className="w-16 h-16 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            <Blobatar
                animate="always"
                name={name.toLowerCase()}
                traits={traits}
            // ARCHITECT: не передаём useGaze — в миниатюре слежение за курсором не нужно
            />
        </motion.div>
    );
}