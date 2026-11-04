import { Blobatar } from "@blobatar/react";
import { motion } from "framer-motion";

// ARCHITECT: MiniBlobatar — легковесная миниатюра Blobatar для бегущей строки Features.
// Не переиспользует BrandBlobatar и НЕ использует useGaze — в marquee слежение за
// курсором не нужно; остаётся только встроенное «дыхание» + дополнительный пульс обёртки.

export interface MiniBlobatarProps {
    name: string;
    traits: Record<string, number | number[]>;
}

export function MiniBlobatar({ name, traits }: MiniBlobatarProps) {
    return (
        <motion.div
            className="flex w-16 h-16 items-center justify-center"
            // ARCHITECT: анимация «дыхания» масштабом; трек-взгляд не подключается
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
            <Blobatar
                animate="always"
                name={name.toLowerCase()}
                traits={traits}
            // Важно: не передаём ref/useGaze — без трекинга курсора в миниатюре
            />
        </motion.div>
    );
}