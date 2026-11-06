// src/components/landing/Footer/Footer.tsx
// ARCHITECT: Полностью монохромная палитра. Никаких цветных акцентов —
// только контраст белого и чёрного. Убраны декоративные блобы и цветные
// градиенты. Минимализм через типографику и пространство.

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Variants, Easing } from 'framer-motion';
import { FOOTER_DATA } from './Footer.data';
import { FooterColumn } from './FooterColumn';
import { SocialLinks } from './SocialLinks';
import { NewsletterForm } from './NewsletterForm';
import { LanguageSwitcher } from './LanguageSwitcher';

// ARCHITECT: Кастомная кривая Безье "outExpo" — быстрый старт, мягкое завершение.
const EASE_PREMIUM: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: EASE_PREMIUM },
    },
};

export function Footer() {
    const footerRef = useRef<HTMLElement>(null);
    const isInView = useInView(footerRef, { once: true, margin: '-50px' });

    const { columns, social, copyright, newsletter } = FOOTER_DATA;

    return (
        <footer
            ref={footerRef}
            className="relative w-full overflow-hidden border-t border-zinc-900 bg-black"
            role="contentinfo"
        >
            {/* ARCHITECT: Едва заметная линия-разделитель, без цветных градиентов */}
            <div
                className="absolute inset-x-0 top-0 h-px bg-white/5"
                aria-hidden="true"
            />

            <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
                {/* Newsletter блок */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    className="mb-16"
                >
                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col items-start gap-6 border-b border-zinc-900 pb-12 lg:flex-row lg:items-center lg:justify-between"
                    >
                        <div className="flex flex-col gap-1.5">
                            <h3 className="text-lg font-medium tracking-tight text-white">
                                {newsletter.title}
                            </h3>
                            <p className="text-sm text-zinc-500">{newsletter.description}</p>
                        </div>
                        <NewsletterForm />
                    </motion.div>
                </motion.div>

                {/* Колонки навигации */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    className="mb-16 grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
                >
                    {columns.map((column) => (
                        <motion.div key={column.title} variants={itemVariants}>
                            <FooterColumn column={column} />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom bar */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                >
                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col items-center justify-between gap-6 sm:flex-row"
                    >
                        <SocialLinks links={social} />

                        <p className="order-3 text-xs text-zinc-600 sm:order-2">
                            {copyright}
                        </p>

                        <div className="order-2 flex items-center gap-2 sm:order-3">
                            <LanguageSwitcher />
                            {/* TODO: добавить ThemeToggle когда будет готова система тем */}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </footer>
    );
}