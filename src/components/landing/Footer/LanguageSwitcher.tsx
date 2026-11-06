// src/components/landing/Footer/LanguageSwitcher.tsx
// ARCHITECT: Флаги заменены кодами языков. Код выведен капсом с трекингом —
// выглядит как осознанная типографическая деталь, а не как fallback Windows.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown } from 'lucide-react';
import { LANGUAGES } from './Footer.data';
import type { LanguageCode } from './Footer.types';

export function LanguageSwitcher() {
    // ARCHITECT: 'ru' по умолчанию — сайт сейчас на русской версии
    const [currentLang, setCurrentLang] = useState<LanguageCode>('ru');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = LANGUAGES.find((l) => l.code === currentLang) ?? LANGUAGES[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (code: LanguageCode): void => {
        setCurrentLang(code);
        setIsOpen(false);
        // TODO: интеграция с i18n (react-i18next) — переключение словарей
        if (import.meta.env.DEV) console.log('[i18n] Language changed:', code);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Выбор языка интерфейса"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-500 transition-colors duration-200 hover:text-white"
            >
                <Globe className="h-4 w-4" aria-hidden="true" />
                {/* ARCHITECT: на мобильных показываем компактный код, на sm+ — название */}
                <span className="text-xs font-medium uppercase tracking-[0.15em] sm:hidden">
                    {selected.short}
                </span>
                <span className="hidden sm:inline">{selected.label}</span>
                <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        role="listbox"
                        aria-label="Доступные языки"
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute bottom-full left-1/2 z-50 mb-2 min-w-[180px] -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 py-1 shadow-2xl shadow-black/50"
                    >
                        {LANGUAGES.map((lang) => {
                            const isActive = lang.code === currentLang;
                            return (
                                <li key={lang.code}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        onClick={() => handleSelect(lang.code)}
                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-zinc-900 ${isActive ? 'text-white' : 'text-zinc-400'
                                            }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`w-6 text-[10px] font-semibold uppercase tracking-[0.2em] ${isActive ? 'text-zinc-300' : 'text-zinc-600'
                                                }`}
                                        >
                                            {lang.short}
                                        </span>
                                        <span>{lang.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}