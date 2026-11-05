// src/components/landing/faq/FaqCard.tsx
// ARCHITECT: Добавлена фиксированная высота (h-[220px] md:h-[200px]) для идеального выравнивания всех карточек.
// ARCHITECT: При hover карточка плавно приподнимается и получает мягкое свечение, без лагающей анимации.
// ARCHITECT: Блобатар позиционирован абсолютно справа и обрезается через overflow-hidden родителя.

import { motion } from "framer-motion";
import { User, Globe } from "lucide-react";
import { FaqBlobatar } from "./FaqBlobatar";
import type { FaqItem } from "./data";

interface FaqCardProps {
    readonly item: FaqItem;
    readonly index: number;
    readonly onClick: () => void;
}

export function FaqCard({ item, index, onClick }: FaqCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            className={item.featured ? "md:col-span-2" : ""}
        >
            <motion.button
                type="button"
                onClick={onClick}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                // ARCHITECT: Фиксированная высота гарантирует, что все карточки в ряду будут абсолютно одинаковыми.
                // ARCHITECT: overflow-hidden критически важен для обрезки Блобатара по правому краю.
                // ARCHITECT: <button> — карточка открывает модалку, поэтому должна быть доступна с клавиатуры.
                className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl bg-white/[0.03] p-5 text-left backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:p-6 md:p-8 h-[220px] md:h-[200px]"
            >
                {/* ARCHITECT: Фоновое свечение при hover */}
                <div 
                    className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "radial-gradient(circle at center, rgba(240,240,245,0.08) 0%, transparent 70%)" }}
                    aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-row items-center gap-4 md:gap-6">
                    {/* ARCHITECT: Текстовый контент (всегда слева); min-w-0 разрешает перенос/обрезку */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            {item.featured ? (
                                <Globe className="size-4 text-[#f0f0f5]/60" aria-hidden="true" />
                            ) : (
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10">
                                    <User className="size-3.5 text-[#f0f0f5]/80" aria-hidden="true" />
                                </div>
                            )}
                            <span className="text-xs font-medium uppercase tracking-wider text-[#f0f0f5]/50">
                                {item.userName}
                            </span>
                        </div>

                        <h3 className="text-base md:text-lg font-semibold text-[#f0f0f5] mb-1.5 group-hover:text-white transition-colors line-clamp-2">
                            {item.question}
                        </h3>

                        <p className="text-sm leading-relaxed text-[#f0f0f5]/60 line-clamp-2">
                            {item.shortAnswer}
                        </p>

                        <div className="mt-3 flex items-center gap-1 text-xs text-[#f0f0f5]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span>Подробнее</span>
                            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* ARCHITECT: Блобатар для featured-карточки — виден на ВСЕХ устройствах.
                        Мобильные: компактный аватар в потоке справа от текста (shrink-0, не давит текст).
                        md+: крупный, абсолютно справа, обрезается границей карточки (overflow-hidden). */}
                    {item.featured && (
                        <div className="pointer-events-none relative size-20 shrink-0 sm:size-24 md:absolute md:top-1/2 md:right-0 md:size-[34rem] md:translate-x-1/4 md:-translate-y-1/2">
                            <FaqBlobatar />
                        </div>
                    )}
                </div>
            </motion.button>
        </motion.div>
    );
}
