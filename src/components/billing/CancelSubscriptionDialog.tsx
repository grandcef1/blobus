// ARCHITECT: подтверждение отмены объясняет последствие: доступ сохраняется до конца периода, а не
// пропадает сразу — иначе подписку отменяют с опаской потерять уже оплаченные дни.

import { useTranslation } from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CancelSubscriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function CancelSubscriptionDialog({
    open,
    onOpenChange,
    onConfirm,
    isPending,
}: CancelSubscriptionDialogProps) {
    const { t } = useTranslation("billing");

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("cancelDialog.description")}</AlertDialogDescription>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{t("cancelDialog.keep")}</AlertDialogCancel>
                    <AlertDialogAction disabled={isPending} onClick={onConfirm}>
                        {t("cancelDialog.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
