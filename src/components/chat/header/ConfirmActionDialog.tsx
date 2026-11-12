// ARCHITECT: общий диалог подтверждения для необратимых действий сессии. window.confirm не
// используется: он блокирует поток, не стилизуется и не даёт описать последствия рядом с кнопкой.
// ARCHITECT: destructive показан красным текстом без яркой заливки — так требует палитра: цвет
// отмечает необратимость, а не украшает кнопку.

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const DESTRUCTIVE_BUTTON =
    "flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-400/30 px-6 text-sm font-medium text-red-400 transition-colors hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300";

interface ConfirmActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
}

export function ConfirmActionDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    destructive = false,
    onConfirm,
}: ConfirmActionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        className={GHOST_BUTTON}
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        className={cn(destructive ? DESTRUCTIVE_BUTTON : PRIMARY_BUTTON)}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
