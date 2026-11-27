// ARCHITECT: меню действий сессии: переименование, ссылка, очистка истории и удаление. Пункты вызывают действия
// страницы через `actions`: мок-ветка пишет в мок-стор, реальная — в PATCH/DELETE/reset, и она же показывает
// результат (тост успеха и ошибку).
// ARCHITECT: маршрут после удаления задаёт страница через actions.remove: меню не знает, где живёт чат.

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "@/store/toast";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { RenameSessionDialog } from "./RenameSessionDialog";
import { CHAT_HEADER_BUTTON } from "./headerButton";
import type { SessionActions } from "./sessionActions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnhancedChatSession } from "@/types/session";

interface SessionActionsMenuProps {
    readonly session: EnhancedChatSession;
    readonly actions: SessionActions;
}

export function SessionActionsMenu({ session, actions }: SessionActionsMenuProps) {
    const { t } = useTranslation("chat");
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isClearOpen, setIsClearOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/app/chat/${session.id}`);
            toast.success(t("actions.toast.linkCopied"));
        } catch {
            toast.error(t("actions.toast.copyFailed"));
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={t("actions.moreLabel")}
                        className={CHAT_HEADER_BUTTON}
                    >
                        <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => setIsRenameOpen(true)}>
                        {t("actions.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleCopyLink}>
                        {t("actions.copyLink")}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => setIsClearOpen(true)}>
                        {t("actions.clearHistory")}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setIsDeleteOpen(true)}>
                        {t("actions.deleteSession")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <RenameSessionDialog
                initialTitle={session.title}
                open={isRenameOpen}
                onOpenChange={setIsRenameOpen}
                onRename={actions.rename}
            />

            <ConfirmActionDialog
                open={isClearOpen}
                onOpenChange={setIsClearOpen}
                title={t("actions.clearHistory")}
                description={t("actions.clearHistoryDescription")}
                confirmLabel={t("actions.clearConfirm")}
                onConfirm={() => {
                    setIsClearOpen(false);
                    void actions.reset();
                }}
            />

            <ConfirmActionDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title={t("actions.deleteSession")}
                description={t("actions.deleteSessionDescription")}
                confirmLabel={t("actions.deleteConfirm")}
                destructive
                onConfirm={() => {
                    setIsDeleteOpen(false);
                    void actions.remove();
                }}
            />
        </>
    );
}
