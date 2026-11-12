// ARCHITECT: меню действий сессии: переименование, ссылка, очистка истории и удаление. Все
// мутации идут через api/sessions и сообщают результат тостом.
// ARCHITECT: маршрут после удаления задаёт ChatPage через onDeleted: меню не знает, где живёт
// чат, и не должно решать это за страницу.

import { useState } from "react";
import { MoreVertical } from "lucide-react";
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
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isClearOpen, setIsClearOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/app/chat/${session.id}`);
            toast.success("Ссылка скопирована");
        } catch {
            toast.error("Не удалось скопировать");
        }
    };

    const handleClear = () => {
        const updated = clearSessionMessages(session.id);
        if (updated) onUpdated(updated);
        setIsClearOpen(false);
        toast.success("История очищена");
    };

    const handleDelete = () => {
        deleteSession(session.id);
        setIsDeleteOpen(false);
        onDeleted();
        toast.success("Сессия удалена");
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Дополнительные действия"
                        className={CHAT_HEADER_BUTTON}
                    >
                        <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => setIsRenameOpen(true)}>
                        Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleCopyLink}>
                        Скопировать ссылку
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={() => setIsClearOpen(true)}>
                        Очистить историю
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setIsDeleteOpen(true)}>
                        Удалить сессию
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
                title="Очистить историю"
                description="Все сообщения удалятся, останется приветствие выбранного режима."
                confirmLabel="Очистить"
                onConfirm={handleClear}
            />

            <ConfirmActionDialog
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                title="Удалить сессию"
                description="Сессия и вся её история исчезнут без возможности восстановления."
                confirmLabel="Удалить"
                destructive
                onConfirm={handleDelete}
            />
        </>
    );
}
