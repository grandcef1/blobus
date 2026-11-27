// ARCHITECT: выбор репетитора в диалоге, а не в подменю: меню строки списка ведёт себя как модальное окно, и
// вложенные подменю в нём закрывались бы вместе с меню. Список — из каталога блобатаров, тот же, что в мастере.
// ARCHITECT: подтверждение отправляет выбранного репетитора наверх; страница решает, куда писать, и показывает
// ошибку. Кнопка «Сохранить» заблокирована, пока выбор не изменился.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MOCK_BLOBATARS } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { GHOST_BUTTON, PRIMARY_BUTTON, SELECTED_FILL } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface TutorPickerDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly currentTutorId: string;
    readonly onConfirm: (tutorId: string) => Promise<void>;
}

export function TutorPickerDialog({
    open,
    onOpenChange,
    currentTutorId,
    onConfirm,
}: TutorPickerDialogProps) {
    const { t } = useTranslation("chat");
    const [selectedId, setSelectedId] = useState(currentTutorId);
    const [lastOpen, setLastOpen] = useState(open);
    const [busy, setBusy] = useState(false);

    // ARCHITECT: выбор сбрасывается на текущего репетитора при каждом открытии: иначе после отмены в диалоге
    // остался бы несохранённый выбор. Правка состояния на рендере, а не в эффекте — как в RenameSessionDialog.
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setSelectedId(currentTutorId);
    }

    const confirm = async (): Promise<void> => {
        if (busy || selectedId === currentTutorId) return;

        setBusy(true);
        try {
            await onConfirm(selectedId);
            onOpenChange(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogTitle>{t("settings.tutor")}</DialogTitle>

                <div role="radiogroup" aria-label={t("settings.tutor")} className="mt-4 flex flex-col gap-1">
                    {MOCK_BLOBATARS.map((blobatar) => (
                        <button
                            key={blobatar.id}
                            type="button"
                            role="radio"
                            aria-checked={selectedId === blobatar.id}
                            onClick={() => setSelectedId(blobatar.id)}
                            className={cn(
                                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
                                selectedId === blobatar.id
                                    ? cn(SELECTED_FILL, "text-[#f0f0f5]")
                                    : "text-[#f0f0f5]/70 hover:bg-white/5"
                            )}
                        >
                            <BlobatarAvatar id={blobatar.id} animated={false} className="size-6 bg-white/5" />
                            {blobatar.name}
                        </button>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        className={GHOST_BUTTON}
                        onClick={() => onOpenChange(false)}
                    >
                        {t("confirm.cancel")}
                    </Button>
                    <Button
                        type="button"
                        disabled={busy || selectedId === currentTutorId}
                        className={PRIMARY_BUTTON}
                        onClick={() => void confirm()}
                    >
                        {t("rename.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
