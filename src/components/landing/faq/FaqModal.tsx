// src/components/landing/faq/FaqModal.tsx
// ARCHITECT: модальное окно с расширенной информацией о вопросе.
// ARCHITECT: текст разбит на абзацы через whitespace-pre-line для лучшей читаемости.
// ARCHITECT: для Blobus Team убрана приписка "спрашивает" (команда отвечает, а не спрашивает).

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { FaqItem } from "./data";

interface FaqModalProps {
    readonly item: FaqItem | null;
    readonly onClose: () => void;
}

export function FaqModal({ item, onClose }: FaqModalProps) {
    useEffect(() => {
        if (!item) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
        
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [item, onClose]);

    return (
        <AnimatePresence>
            {item && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full max-w-2xl rounded-2xl bg-black border border-white/10 p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Кнопка закрытия */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            aria-label="Закрыть"
                        >
                            <X className="size-4 text-[#f0f0f5]" aria-hidden="true" />
                        </button>

                        {/* ARCHITECT: Заголовок с именем. Для Blobus Team не показываем "спрашивает". */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                                <span className="text-sm font-medium text-[#f0f0f5]/80">
                                    {item.userName.charAt(0)}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-[#f0f0f5]/60">
                                {item.featured ? "От команды Blobus" : `${item.userName} спрашивает`}
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-[#f0f0f5] mb-4">
                            {item.question}
                        </h3>

                        {/* ARCHITECT: whitespace-pre-line сохраняет переносы строк из текста (\n\n),
                            создавая визуальные абзацы без необходимости разбивать текст вручную. */}
                        <p className="text-base leading-relaxed text-[#f0f0f5]/70 whitespace-pre-line">
                            {item.fullAnswer}
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}