// ARCHITECT: Поле ввода сообщения. Отправка вынесена наружу через onSend: компонент не знает
// про хранилище, поэтому его легко переиспользовать, а заглушка отправки живёт в api/chat.
// ARCHITECT: textarea text-base на телефоне — 16px отключает автозум iOS при фокусе, с md
// возвращаются прежние 14px; кнопки 44px на телефоне и 40px с md; подсказка про Enter скрыта
// на телефоне — там нет Enter. Нижний отступ учитывает env(safe-area-inset-bottom).

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    disabled?: boolean;
    onSend?: (text: string) => void;
}

// ARCHITECT: быстрые промпты на русском — контекстные подсказки для учеников
const QUICK_PROMPTS = [
    'Объясни это правило',
    'Дай больше примеров',
    'Потренируем диалог',
    'Проверь меня по теме',
];

const ACTION_BUTTON = 'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:size-10';
const MUTED_ACTION = 'text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60';

export function ChatInput({ disabled = false, onSend }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        const text = message.trim();
        if (!text || disabled) return;
        onSend?.(text);
        setMessage('');
    };

    // ARCHITECT: в CJK-раскладке Enter подтверждает кандидата IME, а не отправляет сообщение:
    // без проверки isComposing уходил недописанный текст. keyCode 229 нужен для Safari — там
    // compositionend приходит раньше подтверждающего keydown (WebKit bug 165004), и isComposing
    // к этому моменту уже false.
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
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
        <div className="shrink-0 border-t border-white/10 bg-black/80 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:px-6">
            <div className="mx-auto max-w-3xl py-3 md:py-4">
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
                                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-[#f0f0f5]/50 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:min-h-0 md:py-1.5"
                                >
                                    <Sparkles className="size-3" aria-hidden="true" />
                                    {prompt}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    className={cn(
                        'flex items-end gap-2 rounded-2xl border transition-colors',
                        isFocused ? 'border-white/25 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'
                    )}
                >
                    <button aria-label="Прикрепить файл" className={cn(ACTION_BUTTON, MUTED_ACTION)}>
                        <Paperclip className="size-4" aria-hidden="true" />
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
                            'max-h-[150px] flex-1 resize-none bg-transparent py-2.5 text-base text-[#f0f0f5] md:text-sm',
                            'placeholder:text-[#f0f0f5]/25 focus:outline-none',
                            disabled && 'opacity-50'
                        )}
                    />

                    {/* Голосовой ввод — задел под будущую коррекцию произношения */}
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        aria-label={isRecording ? 'Остановить запись' : 'Начать запись'}
                        className={cn(ACTION_BUTTON, isRecording ? 'bg-[#f0f0f5]/15 text-[#f0f0f5]' : MUTED_ACTION)}
                    >
                        <Mic className={cn('size-4', isRecording && 'animate-pulse')} aria-hidden="true" />
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!message.trim() || disabled}
                        aria-label="Отправить сообщение"
                        className={cn(
                            ACTION_BUTTON,
                            message.trim()
                                ? 'bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90'
                                : 'cursor-not-allowed bg-white/[0.06] text-[#f0f0f5]/20'
                        )}
                    >
                        <Send className="size-4" aria-hidden="true" />
                    </button>
                </div>

                <p className="mt-2 hidden text-center text-[10px] text-[#f0f0f5]/20 md:block">
                    Enter — отправить, Shift+Enter — новая строка
                </p>
            </div>
        </div>
    );
}

