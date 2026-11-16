// ARCHITECT: меню действий сессии: переименование, ссылка, очистка истории и удаление. Все
// мутации идут через api/sessions и сообщают результат тостом.
// ARCHITECT: маршрут после удаления задаёт ChatPage через onDeleted: меню не знает, где живёт
// чат, и не должно решать это за страницу.

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clearSessionMessages, deleteSession } from "@/api/sessions";
import { toast } from "@/store/toast";
import { ConfirmActionDialog } from "./ConfirmActionDialog";
import { RenameSessionDialog } from "./RenameSessionDialog";
import { CHAT_HEADER_BUTTON } from "./headerButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EnhancedChatSession } from "@/types/session";

interface SessionActionsMenuProps {
    session: EnhancedChatSession;
    onUpdated: (session: EnhancedChatSession) => void;
    onDeleted: () => void;
}

export function SessionActionsMenu({ session, onUpdated, onDeleted }: SessionActionsMenuProps) {
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

    const handleClear = () => {
        const updated = clearSessionMessages(session.id);
        if (updated) onUpdated(updated);
        setIsClearOpen(false);
        toast.success(t("actions.toast.historyCleared"));
    };

    const handleDelete = () => {
        deleteSession(session.id);
        setIsDeleteOpen(false);
        onDeleted();
        toast.success(t("actions.toast.sessionDeleted"));
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
                session={session}
                open={isRenameOpen}
                onOpenChange={setIsRenameOpen}
                onUpdated={onUpdated}
            />

            <ConfirmActionDialog
                open={isClearOpen}
                onOpenChange={setIsClearOpen}
                title={t("actions.clearHistory")}
                description={t("actions.clearHistoryDescription")}
                confirmLabel={t("actions.clearConfirm")}
                onConfirm={handleClear}
            />

            <ConfirmActionDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title={t("actions.deleteSession")}
                description={t("actions.deleteSessionDescription")}
                confirmLabel={t("actions.deleteConfirm")}
                destructive
                onConfirm={handleDelete}
            />
        </>
    );
}
