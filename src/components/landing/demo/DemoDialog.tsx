// ARCHITECT: демо-окно — мини-версия реального чата: та же шапка (readOnly, без меню) и те же
// рендереры сообщений, поэтому формат правки и карточек здесь не может разойтись с приложением.
// Нумерации шагов нет: показывается разговор, а не прогресс по викторине.
// ARCHITECT: последнее сообщение меняет главное действие на переход в мастер: после показанного
// примера следующий осмысленный шаг — начать заниматься, а не листать дальше.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DEMO_MESSAGES, DEMO_SESSION } from "@/api/mocks/demoLesson";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageRenderer } from "@/components/chat/messages/MessageRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface DemoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DemoDialog({ open, onOpenChange }: DemoDialogProps) {
    const navigate = useNavigate();
    const [visibleCount, setVisibleCount] = useState(1);
    const [lastOpen, setLastOpen] = useState(open);
    const bottomRef = useRef<HTMLDivElement>(null);

    // ARCHITECT: каждое открытие начинает показ с начала: возвращаться в середину чужого
    // разговора пользователю незачем. Сброс идёт на рендере, а не в эффекте: правило
    // react-hooks/set-state-in-effect запрещает setState в теле эффекта, и сравнение с прошлым
    // значением на рендере — рекомендованный React способ для такого сброса.
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setVisibleCount(1);
    }

    // ARCHITECT: новая реплика должна попадать в поле зрения — лента растёт вниз внутри модалки.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [visibleCount]);

    const visibleMessages = DEMO_MESSAGES.slice(0, visibleCount);
    const lastVisibleId = visibleMessages[visibleMessages.length - 1]?.id;
    const isLast = visibleCount === DEMO_MESSAGES.length;

    const handlePrimary = () => {
        if (isLast) {
            onOpenChange(false);
            navigate("/onboarding");
            return;
        }

        setVisibleCount((previous) => previous + 1);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg overflow-hidden p-0">
                <DialogTitle className="sr-only">Пример урока</DialogTitle>
                <DialogDescription className="sr-only">
                    Так выглядит диалог с репетитором: ответ, правка и новая лексика.
                </DialogDescription>

                <ChatHeader session={DEMO_SESSION} readOnly />

                <div
                    aria-live="polite"
                    className="thin-scroll flex max-h-[min(28rem,55dvh)] flex-col gap-4 overflow-y-auto px-4 py-5"
                >
                    {visibleMessages.map((message) => (
                        <MessageRenderer
                            key={message.id}
                            message={message}
                            session={DEMO_SESSION}
                            isLast={message.id === lastVisibleId}
                        />
                    ))}
                    <div ref={bottomRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-white/5 bg-black/40 px-4 py-3">
                    {/* ARCHITECT: поле — визуальная заглушка: пример листается кнопкой, ввод в демо
                        ничего не значит, поэтому поддельный инпут не должен притворяться настоящим. */}
                    <p
                        aria-hidden="true"
                        className="min-w-0 flex-1 truncate rounded-2xl border border-white/5 px-4 py-2.5 text-sm text-[#f0f0f5]/25"
                    >
                        Напиши сообщение на английском...
                    </p>

                    <Button
                        type="button"
                        onClick={handlePrimary}
                        className={cn(PRIMARY_BUTTON, "shrink-0 px-5")}
                    >
                        {isLast ? "Начать бесплатно" : "Дальше"}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
