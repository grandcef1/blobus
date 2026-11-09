// ARCHITECT: Поле ввода сообщения — переведено на русский
// Быстрые промпты локализованы для русскоязычных пользователей

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    disabled?: boolean;
}

// ARCHITECT: быстрые промпты на русском — контекстные подсказки для учеников
const QUICK_PROMPTS = [
    'Объясни это правило',
    'Дай больше примеров',
    'Потренируем диалог',
    'Проверь меня по теме',
];

export function ChatInput({ disabled = false }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!message.trim() || disabled) return;
        console.log('Отправка сообщения:', message);
        setMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [message]);

    return (
        <div className="shrink-0 border-t border-white/10 bg-black/80 px-4 py-4 backdrop-blur-sm md:px-6">
            <div className="mx-auto max-w-3xl">
                {/* Быстрые промпты */}
                <AnimatePresence>
                    {isFocused && !message && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="mb-3 flex flex-wrap gap-2"
                        >
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => setMessage(prompt)}
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04]',
                                        'px-3 py-1.5 text-xs text-[#f0f0f5]/50 transition-colors',
                                        'hover:border-white/25 hover:bg-white/[0.08] hover:text-[#f0f0f5]/80'
                                    )}
                                >
                                    <Sparkles className="size-3" />
                                    {prompt}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Контейнер ввода */}
                <div
                    className={cn(
                        'flex items-end gap-2 rounded-2xl border transition-colors',
                        isFocused
                            ? 'border-white/25 bg-white/[0.06]'
                            : 'border-white/10 bg-white/[0.03]'
                    )}
                >
                    <button
                        aria-label="Прикрепить файл"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#f0f0f5]/30 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/60"
                    >
                        <Paperclip className="size-4" />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Напиши сообщение на английском..."
                        disabled={disabled}
                        rows={1}
                        aria-label="Поле ввода сообщения"
                        className={cn(
                            'max-h-[150px] flex-1 resize-none bg-transparent py-2.5 text-sm text-[#f0f0f5]',
                            'placeholder:text-[#f0f0f5]/25 focus:outline-none',
                            disabled && 'opacity-50'
                        )}
                    />

                    {/* Голосовой ввод — задел под будущую коррекцию произношения */}
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        aria-label={isRecording ? 'Остановить запись' : 'Начать запись'}
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                            isRecording
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60'
                        )}
                    >
                        <Mic className={cn('size-4', isRecording && 'animate-pulse')} />
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!message.trim() || disabled}
                        aria-label="Отправить сообщение"
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-all',
                            message.trim()
                                ? 'bg-[#f0f0f5] text-black hover:scale-105'
                                : 'bg-white/[0.06] text-[#f0f0f5]/20 cursor-not-allowed'
                        )}
                    >
                        <Send className="size-4" />
                    </button>
                </div>

                <p className="mt-2 text-center text-[10px] text-[#f0f0f5]/20">
                    Enter — отправить, Shift+Enter — новая строка
                </p>
            </div>
        </div>
    );
}