// ARCHITECT: меню строки списка сессий: те же действия, что в шапке чата — переименовать, сменить репетитора,
// очистить историю и удалить. Строка остаётся ссылкой: меню стоит рядом и не перехватывает переход в чат
// (клик по кнопке гасит переход по ссылке).
// ARCHITECT: необратимые действия идут через подтверждение с явным текстом последствий (§спец. 4): сброс и
// удаление показаны отдельными диалогами, а не выполняются по клику пункта.

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmActionDialog } from "@/components/chat/header/ConfirmActionDialog";
import { RenameSessionDialog } from "@/components/chat/header/RenameSessionDialog";
import { TutorPickerDialog } from "@/components/chat/header/TutorPickerDialog";
import { CHAT_HEADER_BUTTON } from "@/components/chat/header/headerButton";
import type { SessionActions } from "@/components/chat/header/sessionActions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SessionRowMenuProps {
    /** Название сессии: null — его не задавали, и поле переименования начинается пустым. */
    readonly title: string | null;
    readonly tutorId: string;
    readonly actions: SessionActions;
}

type OpenDialog = "rename" | "tutor" | "reset" | "delete" | null;

export function SessionRowMenu({ title, tutorId, actions }: SessionRowMenuProps) {
    const { t } = useTranslation("chat");
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

    const close = (): void => setOpenDialog(null);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={t("actions.moreLabel")}
                        className={CHAT_HEADER_BUTTON}
                        // ARCHITECT: строка — ссылка: без этого клик по меню уводил бы в чат.
                        onClick={(event) => event.preventDefault()}
                    >
                        <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    className="w-56"
                    onClick={(event) => event.preventDefault()}
                >
                    <DropdownMenuItem onSelect={() => setOpenDialog("rename")}>
                        {t("actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setOpenDialog("tutor")}>
                        {t("settings.tutor")}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => setOpenDialog("reset")}>
                        {t("actions.clearHistory")}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setOpenDialog("delete")}>
                        {t("actions.deleteSession")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <RenameSessionDialog
                initialTitle={title ?? ""}
                open={openDialog === "rename"}
                onOpenChange={(open) => (open ? setOpenDialog("rename") : close())}
                onRename={actions.rename}
            />

            <TutorPickerDialog
                open={openDialog === "tutor"}
                onOpenChange={(open) => (open ? setOpenDialog("tutor") : close())}
                currentTutorId={tutorId}
                onConfirm={actions.changeTutor}
            />

            <ConfirmActionDialog
                open={openDialog === "reset"}
                onOpenChange={(open) => (open ? setOpenDialog("reset") : close())}
                title={t("actions.clearHistory")}
                description={t("actions.clearHistoryDescription")}
                confirmLabel={t("actions.clearConfirm")}
                onConfirm={() => {
                    close();
                    void actions.reset();
                }}
            />

            <ConfirmActionDialog
                open={openDialog === "delete"}
                onOpenChange={(open) => (open ? setOpenDialog("delete") : close())}
                title={t("actions.deleteSession")}
                description={t("actions.deleteSessionDescription")}
                confirmLabel={t("actions.deleteConfirm")}
                destructive
                onConfirm={() => {
                    close();
                    void actions.remove();
                }}
            />
        </>
    );
}
