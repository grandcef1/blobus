// ARCHITECT: тред обращения. Поддержка слева, пользователь справа — как в чате, поэтому лента
// читается без подписей авторов. Отправка по Enter, Shift+Enter оставляет перенос строки.
// ARCHITECT: высота ограничена dvh, а не фиксированными пикселями: на телефоне поле ввода не
// уезжает под клавиатуру при появлении экранной раскладки.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import { sendTicketMessage } from "@/api/support";
import { toast } from "@/store/toast";
import { formatRelativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import type { SupportTicket } from "@/types/support";

const THREAD_HEIGHT = "h-[min(32rem,calc(100dvh-14rem))]";
const COMPOSER =
    "max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-base text-[#f0f0f5] placeholder:text-[#f0f0f5]/25 focus:outline-none focus:ring-2 focus:ring-[#f0f0f5]/20 md:text-sm";

interface TicketThreadProps {
    ticket: SupportTicket;
}

export function TicketThread({ ticket }: TicketThreadProps) {
    const shouldReduceMotion = useReducedMotion();
    const [current, setCurrent] = useState(ticket);
    const [draft, setDraft] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // ARCHITECT: плавный автоскролл — движение, поэтому он же и учитывает настройку системы.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth" });
    }, [current.messages.length, shouldReduceMotion]);

    const handleSend = () => {
        const text = draft.trim();
        if (!text) return;

        const updated = sendTicketMessage(current.id, text);
        if (!updated) return;

        setCurrent(updated);
        setDraft("");
        toast.success("Сообщение отправлено");
    };

    return (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#111113]">
            <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                <h2 className="min-w-0 truncate text-sm font-medium text-[#f0f0f5]">
                    {current.subject}
                </h2>
                <TicketStatusBadge status={current.status} />
            </header>

            <div
                className={cn("flex flex-col gap-3 overflow-y-auto p-4", THREAD_HEIGHT)}
                aria-live="polite"
            >
                {current.messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "max-w-[85%] rounded-2xl p-4",
                            message.author === "user"
                                ? "self-end bg-white/10"
                                : "self-start bg-white/[0.04]"
                        )}
                    >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f0f0f5]/80">
                            {message.content}
                        </p>
                        <p className="mt-2 text-xs text-[#f0f0f5]/40">
                            {formatRelativeTime(message.timestamp)}
                        </p>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-end gap-2 border-t border-white/5 p-3">
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            // ARCHITECT: Enter подтверждает кандидата IME (CJK) — отправлять в этот
                            // момент нельзя. keyCode 229 страхует Safari с его порядком событий.
                            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                            handleSend();
                        }
                    }}
                    rows={1}
                    placeholder="Напишите сообщение"
                    aria-label="Сообщение в поддержку"
                    className={COMPOSER}
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    aria-label="Отправить сообщение"
                    className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]",
                        draft.trim()
                            ? "bg-[#f0f0f5] text-black hover:bg-[#f0f0f5]/90"
                            : "cursor-not-allowed bg-white/[0.06] text-[#f0f0f5]/20"
                    )}
                >
                    <Send className="size-4" aria-hidden="true" />
                </button>
            </div>
        </section>
    );
}
