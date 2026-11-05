// src/components/landing/faq/FaqSection.tsx
// ARCHITECT: Кнопка поддержки обновлена.
// ARCHITECT: font-semibold заменен на font-medium, добавлен tracking-wide для премиального, "воздушного" вида.

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { FAQ_ITEMS } from "./data";
import type { FaqItem } from "./data";
import { FaqCard } from "./FaqCard";
import { FaqModal } from "./FaqModal";

export function FaqSection() {
    const [selectedItem, setSelectedItem] = useState<FaqItem | null>(null);

    return (
        <section id="faq" className="relative w-full bg-black py-24 md:py-32">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-16 text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight text-[#f0f0f5] md:text-5xl">
                        Частые вопросы
                    </h2>
                    <p className="mt-4 text-base text-[#f0f0f5]/60 md:text-lg">
                        Всё, что нужно знать о Blobus
                    </p>
                </motion.header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {FAQ_ITEMS.map((item, index) => (
                        <FaqCard
                            key={item.id}
                            item={item}
                            index={index}
                            onClick={() => setSelectedItem(item)}
                        />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="mt-20 text-center"
                >
                    <div className="inline-flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-10 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-[#f0f0f5]/80">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                                <Mail className="size-5 text-[#f0f0f5]" aria-hidden="true" />
                            </div>
                            <h3 className="text-xl font-semibold tracking-tight text-[#f0f0f5]">
                                Остались вопросы?
                            </h3>
                        </div>
                        <p className="max-w-md text-sm text-[#f0f0f5]/50">
                            Не нашли ответ? Напишите нам, и мы лично поможем разобраться в любом вопросе.
                        </p>
                        
                        {/* ARCHITECT: Обновленная кнопка. font-medium и tracking-wide делают текст 
                            элегантным и премиальным, убирая эффект "кричащего" жирного шрифта. */}
                        <a
                            href="mailto:support@blobus.com"
                            className="group inline-flex items-center gap-2 rounded-full bg-[#f0f0f5] px-8 py-3.5 text-sm font-medium tracking-wide text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(240,240,245,0.4)]"
                        >
                            Написать в поддержку
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                        </a>
                    </div>
                </motion.div>
            </div>

            <FaqModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
            />
        </section>
    );
}