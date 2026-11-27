// ARCHITECT: переименование сессии. Валидация на месте: пустое или слишком длинное название не
// уходит в api, кнопка сохранения заблокирована до валидности.
// ARCHITECT: значение перечитывается из начального названия при каждом открытии — иначе после отмены в поле
// осталось бы несохранённое название. Состояние правится на рендере, а не в эффекте: эффект дал
// бы кадр со старым названием в уже открытом диалоге.
// ARCHITECT: сохранение уходит наверх колбэком: страница решает, куда писать (мок-стор или PATCH), и она же
// показывает ошибку — диалог остаётся формой.

import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { GHOST_BUTTON, INPUT_SURFACE, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

const TITLE_MAX_LENGTH = 80;

interface RenameSessionDialogProps {
    readonly initialTitle: string;
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onRename: (title: string) => Promise<void>;
}

export function RenameSessionDialog({
    initialTitle,
    open,
    onOpenChange,
    onRename,
}: RenameSessionDialogProps) {
    const { t } = useTranslation("chat");
    const [value, setValue] = useState(initialTitle);
    const [error, setError] = useState<string | undefined>(undefined);
    const [busy, setBusy] = useState(false);
    const [lastOpen, setLastOpen] = useState(open);

    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) {
            setValue(initialTitle);
            setError(undefined);
        }
    }

    const trimmed = value.trim();
    const isValid = trimmed.length >= 1 && trimmed.length <= TITLE_MAX_LENGTH;

    const handleSubmit = async (event: FormEvent): Promise<void> => {
        event.preventDefault();
        if (!isValid || busy) {
            if (!isValid)
                setError(
                    trimmed
                        ? t("rename.errorMaxLength", { max: TITLE_MAX_LENGTH })
                        : t("rename.errorRequired")
                );
            return;
        }

        setBusy(true);
        try {
            await onRename(trimmed);
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogTitle>{t("rename.title")}</DialogTitle>

                <form onSubmit={handleSubmit} noValidate className="mt-4">
                    <label htmlFor="session-title" className="mb-1.5 block text-sm text-[#f0f0f5]/70">
                        {t("rename.label")}
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
                            {t("confirm.cancel")}
                        </Button>
                        <Button type="submit" disabled={!isValid || busy} className={PRIMARY_BUTTON}>
                            {t("rename.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
