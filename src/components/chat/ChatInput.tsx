// ARCHITECT: Поле ввода сообщения. Отправка вынесена наружу через onSend: компонент не знает
// про хранилище, поэтому его легко переиспользовать, а заглушка отправки живёт в api/chat.
// ARCHITECT: textarea text-base на телефоне — 16px отключает автозум iOS при фокусе, с md
// возвращаются прежние 14px; кнопки 44px, поле и кнопки выровнены по одной сетке строки; подсказка про Enter
// скрыта на телефоне — там нет Enter. Нижний отступ учитывает env(safe-area-inset-bottom).
// ARCHITECT: прикрепление файла убрано целиком: загрузки в контракте чата нет, а кнопка обещала её.
// ARCHITECT: микрофон показывается только там, где браузер умеет распознавание — нерабочей кнопки нет; во время
// записи строка ввода заменяется панелью VoiceRecorder.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isDictationSupported } from '@/lib/dictation';
import { cn } from '@/lib/utils';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatInputProps {
    disabled?: boolean;
    onSend?: (text: string) => void;
}

// ARCHITECT: быстрые промпты лежат ключами: t() резолвит подпись и в рендере, и в момент клика,
// поэтому в поле попадает текст текущего языка (введённый пользователем текст не перепереводится).
const QUICK_PROMPT_KEYS = [
    'input.quickPrompts.rule',
    'input.quickPrompts.examples',
    'input.quickPrompts.dialogue',
    'input.quickPrompts.check',
] as const;

const ACTION_BUTTON = 'flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]';
const MUTED_ACTION = 'text-[#f0f0f5]/40 hover:bg-white/[0.06] hover:text-[#f0f0f5]/70';
const SEND_ACTION = 'bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-[#f0f0f5]/20';

export function ChatInput({ disabled = false, onSend }: ChatInputProps) {
    const { t } = useTranslation('chat');
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // ARCHITECT: поддержка распознавания в течение сессии страницы не меняется: проверка один раз при рендере.
    const canDictate = isDictationSupported();

    const handleSubmit = (text: string = message) => {
        const trimmed = text.trim();
        if (!trimmed || disabled) return;
        onSend?.(trimmed);
        setMessage('');
    };

    const handleRecorded = (text: string) => {
        setIsRecording(false);
        handleSubmit(text);
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
                    {isFocused && !message && !isRecording && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="mb-3 flex flex-wrap gap-2"
                        >
                            {QUICK_PROMPT_KEYS.map((key) => (
                                <button
                                    key={key}
                                    onClick={() => setMessage(t(key))}
                                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-[#f0f0f5]/50 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-[#f0f0f5]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] md:min-h-0 md:py-1.5"
                                >
                                    <Sparkles className="size-3" aria-hidden="true" />
                                    {t(key)}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isRecording ? (
                    <VoiceRecorder
                        onSend={handleRecorded}
                        onCancel={() => setIsRecording(false)}
                    />
                ) : (
                    <div
                        className={cn(
                            'flex items-end gap-2 rounded-2xl border px-2 py-1.5 transition-colors',
                            isFocused ? 'border-white/25 bg-white/[0.06]' : 'border-white/10 bg-white/[0.03]'
                        )}
                    >
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={t('input.placeholder')}
                            disabled={disabled}
                            rows={1}
                            aria-label={t('input.inputLabel')}
                            className={cn(
                                'max-h-[150px] flex-1 resize-none bg-transparent py-3 text-base text-[#f0f0f5] md:text-sm',
                                'placeholder:text-[#f0f0f5]/25 focus:outline-none',
                                disabled && 'opacity-50'
                            )}
                        />

                        {canDictate && (
                            <button
                                type="button"
                                onClick={() => setIsRecording(true)}
                                disabled={disabled}
                                aria-label={t('input.startRecording')}
                                className={cn(ACTION_BUTTON, MUTED_ACTION)}
                            >
                                <Mic className="size-4" aria-hidden="true" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={!message.trim() || disabled}
                            aria-label={t('input.send')}
                            className={cn(ACTION_BUTTON, SEND_ACTION)}
                        >
                            <Send className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                <p className="mt-2 hidden text-center text-[10px] text-[#f0f0f5]/20 md:block">
                    {isRecording ? t('input.record.escapeHint') : t('input.hint')}
                </p>
            </div>
        </div>
    );
}

