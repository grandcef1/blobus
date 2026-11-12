// ARCHITECT: создание обращения. Категория — нативный select: пунктов пять, и стилизовать его
// проще, чем тянуть Radix Select ради одного поля.
// ARCHITECT: ошибки выводятся по мере ввода (непустое поле неверной длины), а кнопка отправки
// заблокирована до валидности: так не нужно хранить состояние ошибок и не бывает случая, когда
// ошибка осталась на экране после исправления.
// ARCHITECT: черновик очищается при открытии диалога: состояние правится на рендере, а не в
// эффекте — эффект дал бы кадр с прошлым текстом в уже открытом диалоге.

import { useState, type FormEvent } from "react";
import { createTicket } from "@/api/support";
import { toast } from "@/store/toast";
import { TICKET_CATEGORY_LABELS } from "@/types/support";
import type { TicketCategory } from "@/types/support";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { GHOST_BUTTON, INPUT_SURFACE, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const SUBJECT_MIN = 5;
const SUBJECT_MAX = 80;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;
const CATEGORIES = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];
const FIELD_LABEL = "mb-1.5 block text-sm text-[#f0f0f5]/70";
const FIELD_ERROR = "mt-1.5 text-xs text-red-300";
const FIELD_VALID = "focus:ring-[#f0f0f5]/20";
const FIELD_INVALID = "border-red-400/40 focus:ring-red-400/50";

interface TicketDraft {
    subject: string;
    category: TicketCategory;
    message: string;
}

const EMPTY_DRAFT: TicketDraft = { subject: "", category: "technical", message: "" };

interface NewTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (ticketId: string) => void;
}

function lengthError(value: string, min: number, max: number): string | undefined {
    const length = value.trim().length;
    if (length === 0) return undefined;
    if (length < min) return `Минимум ${min} символов`;
    if (length > max) return `Максимум ${max} символов`;
    return undefined;
}

export function NewTicketDialog({ open, onOpenChange, onCreated }: NewTicketDialogProps) {
    const [draft, setDraft] = useState<TicketDraft>(EMPTY_DRAFT);
    const [lastOpen, setLastOpen] = useState(open);

    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setDraft(EMPTY_DRAFT);
    }

    const trimmedSubject = draft.subject.trim();
    const trimmedMessage = draft.message.trim();
    const subjectError = lengthError(draft.subject, SUBJECT_MIN, SUBJECT_MAX);
    const messageError = lengthError(draft.message, MESSAGE_MIN, MESSAGE_MAX);
    const isValid =
        trimmedSubject.length >= SUBJECT_MIN && trimmedSubject.length <= SUBJECT_MAX &&
        trimmedMessage.length >= MESSAGE_MIN && trimmedMessage.length <= MESSAGE_MAX;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!isValid) return;

        const ticket = createTicket({
            subject: trimmedSubject,
            category: draft.category,
            message: trimmedMessage,
        });
        onOpenChange(false);
        toast.success("Обращение создано");
        onCreated(ticket.id);
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Новое обращение</DialogTitle>
                <DialogDescription>
                    Опишите вопрос подробнее: так поддержке не придётся уточнять детали.
                </DialogDescription>

                <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
                    <div>
                        <label htmlFor="ticket-subject" className={FIELD_LABEL}>Тема</label>
                        <input
                            id="ticket-subject"
                            value={draft.subject}
                            onChange={(event) => setDraft((p) => ({ ...p, subject: event.target.value }))}
                            aria-invalid={subjectError ? true : undefined}
                            aria-describedby={subjectError ? "ticket-subject-error" : undefined}
                            className={cn(INPUT_SURFACE, subjectError ? FIELD_INVALID : FIELD_VALID)}
                        />
                        {subjectError && <p id="ticket-subject-error" className={FIELD_ERROR}>{subjectError}</p>}
                    </div>

                    <div>
                        <label htmlFor="ticket-category" className={FIELD_LABEL}>Категория</label>
                        <select
                            id="ticket-category"
                            value={draft.category}
                            onChange={(event) => setDraft((p) => ({ ...p, category: event.target.value as TicketCategory }))}
                            className={cn(INPUT_SURFACE, FIELD_VALID)}
                        >
                            {CATEGORIES.map((value) => (
                                <option key={value} value={value}>{TICKET_CATEGORY_LABELS[value]}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="ticket-message" className={FIELD_LABEL}>Сообщение</label>
                        <textarea
                            id="ticket-message"
                            rows={4}
                            value={draft.message}
                            onChange={(event) => setDraft((p) => ({ ...p, message: event.target.value }))}
                            aria-invalid={messageError ? true : undefined}
                            aria-describedby={messageError ? "ticket-message-error" : undefined}
                            className={cn(INPUT_SURFACE, "resize-none", messageError ? FIELD_INVALID : FIELD_VALID)}
                        />
                        {messageError && <p id="ticket-message-error" className={FIELD_ERROR}>{messageError}</p>}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            className={GHOST_BUTTON}
                            onClick={() => onOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        <Button type="submit" disabled={!isValid} className={PRIMARY_BUTTON}>
                            Отправить
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}