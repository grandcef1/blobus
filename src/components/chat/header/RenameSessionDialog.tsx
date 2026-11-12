// ARCHITECT: переименование сессии. Валидация на месте: пустое или слишком длинное название не
// уходит в api, кнопка сохранения заблокирована до валидности.
// ARCHITECT: значение перечитывается из сессии при каждом открытии — иначе после отмены в поле
// осталось бы несохранённое название. Состояние правится на рендере, а не в эффекте: эффект дал
// бы кадр со старым названием в уже открытом диалоге.

import { useState, type FormEvent } from "react";
import { updateSession } from "@/api/sessions";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { GHOST_BUTTON, INPUT_SURFACE, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";

const TITLE_MAX_LENGTH = 80;

interface RenameSessionDialogProps {
    session: EnhancedChatSession;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdated: (session: EnhancedChatSession) => void;
}

export function RenameSessionDialog({
    session,
    open,
    onOpenChange,
    onUpdated,
}: RenameSessionDialogProps) {
    const [value, setValue] = useState(session.title);
    const [error, setError] = useState<string | undefined>(undefined);
    const [lastOpen, setLastOpen] = useState(open);

    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) {
            setValue(session.title);
            setError(undefined);
        }
    }

    const trimmed = value.trim();
    const isValid = trimmed.length >= 1 && trimmed.length <= TITLE_MAX_LENGTH;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!isValid) {
            setError(trimmed ? `Максимум ${TITLE_MAX_LENGTH} символов` : "Укажи название");
            return;
        }

        const updated = updateSession(session.id, { title: trimmed });
        if (updated) onUpdated(updated);
        onOpenChange(false);
        toast.success("Название сохранено");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogTitle>Переименовать сессию</DialogTitle>

                <form onSubmit={handleSubmit} noValidate className="mt-4">
                    <label htmlFor="session-title" className="mb-1.5 block text-sm text-[#f0f0f5]/70">
                        Название
                    </label>
                    <input
                        id="session-title"
                        value={value}
                        onChange={(event) => {
                            setValue(event.target.value);
                            if (error) setError(undefined);
                        }}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "session-title-error" : undefined}
                        className={cn(
                            INPUT_SURFACE,
                            error
                                ? "border-red-400/40 focus:ring-red-400/50"
                                : "focus:ring-[#f0f0f5]/20"
                        )}
                    />
                    {error && (
                        <p id="session-title-error" className="mt-1.5 text-xs text-red-300">
                            {error}
                        </p>
                    )}

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
                            Сохранить
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
