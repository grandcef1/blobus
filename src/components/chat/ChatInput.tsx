// ARCHITECT: Поле ввода сообщения с кнопками действий

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    disabled?: boolean;
}

const QUICK_PROMPTS = [
    'Explain this grammar rule',
    'Give me more examples',
    'Practice conversation',
    'Quiz me on this topic',
];

export function ChatInput({ disabled = false }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!message.trim() || disabled) return;
        console.log('Sending message:', message);
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

                <div
                    className={cn(
                        'flex items-end gap-2 rounded-2xl border transition-colors',
                        isFocused
                            ? 'border-white/25 bg-white/[0.06]'
                            : 'border-white/10 bg-white/[0.03]'
                    )}
                >
                    <button
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[#f0f0f5]/30 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]/60"
                        title="Attach file"
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
                        placeholder="Type your message in English..."
                        disabled={disabled}
                        rows={1}
                        className={cn(
                            'max-h-[150px] flex-1 resize-none bg-transparent py-2.5 text-sm text-[#f0f0f5]',
                            'placeholder:text-[#f0f0f5]/25 focus:outline-none',
                            disabled && 'opacity-50'
                        )}
                    />

                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                            isRecording
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'text-[#f0f0f5]/30 hover:bg-white/[0.06] hover:text-[#f0f0f5]/60'
                        )}
                        title="Voice input"
                    >
                        <Mic className={cn('size-4', isRecording && 'animate-pulse')} />
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!message.trim() || disabled}
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
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}