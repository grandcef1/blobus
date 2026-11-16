// src/components/landing/Footer/NewsletterForm.tsx
// ARCHITECT: Кастомная инлайн-валидация вместо браузерных пузырей:
// браузерные подсказки не локализуются и ломают монохромный стиль.
// Ошибка живёт под полем, в типографике футера; приглушённый красный —
// единственный стратегический акцент (по правилам: ошибки = red accent).

import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FOOTER_NEWSLETTER } from './Footer.data';

type FormStatus = 'idle' | 'success';

// ARCHITECT: Простая regex-проверка достаточна для UX на фронтенде;
// финальная валидация — на бэкенде (правило: валидировать с обеих сторон).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ARCHITECT: функция возвращает ключ словаря, а не текст: перевод делает компонент, поэтому в модуле
// нет ни одной строки интерфейса, и сообщение меняется вместе с языком.
type NewsletterErrorKey = 'newsletter.errors.empty' | 'newsletter.errors.format';

function validateEmail(value: string): NewsletterErrorKey | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 'newsletter.errors.empty';
    if (!EMAIL_PATTERN.test(trimmed)) return 'newsletter.errors.format';
    return null;
}

export function NewsletterForm() {
    const { t } = useTranslation('footer');
    const [email, setEmail] = useState<string>('');
    const [errorKey, setErrorKey] = useState<NewsletterErrorKey | null>(null);
    const [status, setStatus] = useState<FormStatus>('idle');
    const resetTimerRef = useRef<number | null>(null);

    // ARCHITECT: чистим таймер при размонтировании — защита от утечек
    useEffect(() => {
        return () => {
            if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
        };
    }, []);

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const next = event.target.value;
        setEmail(next);
        // ARCHITECT: паттерн "touched" — не нудим при вводе, пока не было ошибки;
        // после первой ошибки перевалидируем на лету, чтобы пользователь сразу
        // видел, что исправил верно
        if (errorKey !== null) setErrorKey(validateEmail(next));
        if (status === 'success') setStatus('idle');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const nextError = validateEmail(email);
        if (nextError !== null) {
            setErrorKey(nextError);
            return;
        }

        setErrorKey(null);
        // TODO: заменить на реальный API-вызов через бэкенд
        if (import.meta.env.DEV) console.log('[Newsletter] Subscribed:', email.trim());

        setStatus('success');
        setEmail('');

        if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 3000);
    };

    const hasError = errorKey !== null;
    const isSuccess = status === 'success';

    return (
        <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
            {/* ARCHITECT (RESPONSIVE FIX): ранее инпут имел flex-1 внутри flex-col —
                flex-basis:0% по ГЛАВНОЙ оси (вертикали) перебивал h-11, и поле
                схлопывалось до высоты контента на mobile. Теперь flex-1 включается
                только с sm: (row-направление), а на mobile высота жёстко h-12 (48px —
                комфортный touch-target). Кнопка синхронно h-12. */}
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="email"
                    placeholder={t(FOOTER_NEWSLETTER.placeholderKey)}
                    value={email}
                    onChange={handleChange}
                    disabled={isSuccess}
                    aria-label={t('newsletter.emailLabel')}
                    aria-invalid={hasError}
                    aria-describedby="newsletter-hint"
                    className={`h-12 min-h-12 w-full rounded-lg border bg-transparent px-4 text-base transition-colors duration-200 placeholder:text-zinc-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-1 sm:text-sm ${hasError
                            ? 'border-red-400/40 text-white focus:border-red-400/60'
                            : 'border-zinc-800 text-white focus:border-zinc-500'
                        }`}
                />
                <AnimatePresence mode="wait">
                    <motion.button
                        key={status}
                        type="submit"
                        disabled={isSuccess}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="flex h-12 min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-5 text-sm font-medium text-black transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        {isSuccess ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                {t(FOOTER_NEWSLETTER.successKey)}
                            </>
                        ) : (
                            <>
                                {t(FOOTER_NEWSLETTER.buttonKey)}
                                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            </>
                        )}
                    </motion.button>
                </AnimatePresence>
            </div>

            {/* ARCHITECT: зарезервированная высота (min-h) — появление сообщения
          не сдвигает layout (защита от layout shift) */}
            <div id="newsletter-hint" aria-live="polite" className="min-h-[1.25rem] pt-1.5">
                <AnimatePresence mode="wait">
                    {hasError && errorKey !== null ? (
                        <motion.p
                            key="error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 text-xs text-red-400/90"
                        >
                            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{t(errorKey)}</span>
                        </motion.p>
                    ) : isSuccess ? (
                        <motion.p
                            key="success"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 text-xs text-zinc-500"
                        >
                            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{t('newsletter.successHint')}</span>
                        </motion.p>
                    ) : null}
                </AnimatePresence>
            </div>
        </form>
    );
}