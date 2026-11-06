// src/components/landing/Footer/NewsletterForm.tsx
// ARCHITECT: Кастомная инлайн-валидация вместо браузерных пузырей:
// браузерные подсказки не локализуются и ломают монохромный стиль.
// Ошибка живёт под полем, в типографике футера; приглушённый красный —
// единственный стратегический акцент (по правилам: ошибки = red accent).

import { useState, useRef, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { FOOTER_DATA } from './Footer.data';

type FormStatus = 'idle' | 'success';

// ARCHITECT: Простая regex-проверка достаточна для UX на фронтенде;
// финальная валидация — на бэкенде (правило: валидировать с обеих сторон).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return 'Введите email — иначе не сможем прислать новости.';
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
        return 'Похоже, в адресе опечатка. Формат: name@domain.com';
    }
    return null;
}

export function NewsletterForm() {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<FormStatus>('idle');
    const resetTimerRef = useRef<number | null>(null);
    const { placeholder, buttonLabel, successLabel } = FOOTER_DATA.newsletter;

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
        if (error !== null) setError(validateEmail(next));
        if (status === 'success') setStatus('idle');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const nextError = validateEmail(email);
        if (nextError !== null) {
            setError(nextError);
            return;
        }

        setError(null);
        // TODO: заменить на реальный API-вызов через бэкенд
        if (import.meta.env.DEV) console.log('[Newsletter] Subscribed:', email.trim());

        setStatus('success');
        setEmail('');

        if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = window.setTimeout(() => setStatus('idle'), 3000);
    };

    const hasError = error !== null;
    const isSuccess = status === 'success';

    return (
        <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="email"
                    placeholder={placeholder}
                    value={email}
                    onChange={handleChange}
                    disabled={isSuccess}
                    aria-label="Электронная почта для рассылки"
                    aria-invalid={hasError}
                    aria-describedby="newsletter-hint"
                    className={`h-11 flex-1 rounded-lg border bg-transparent px-4 text-base transition-colors duration-200 placeholder:text-zinc-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${hasError
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
                        className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white px-5 text-sm font-medium text-black transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        {isSuccess ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                {successLabel}
                            </>
                        ) : (
                            <>
                                {buttonLabel}
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
                    {hasError && error !== null ? (
                        <motion.p
                            key="error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-1.5 text-xs text-red-400/90"
                        >
                            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{error}</span>
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
                            <span>Отлично! Первое письмо уже в пути.</span>
                        </motion.p>
                    ) : null}
                </AnimatePresence>
            </div>
        </form>
    );
}