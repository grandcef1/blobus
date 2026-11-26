// ARCHITECT: модалка правки аватара: смена и удаление живут здесь, потому что в карточке профиля для них
// осталось только затемнение на ховере. Логика перенесена из ProfileAvatar без ослабления гарда и тостов:
// busy-гард, разбор 401 через общий useAuthExpiry и инвалидация ["profile"] те же.

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";

import { ApiError } from "@/api/client";
import { deleteAvatar, uploadAvatar } from "@/api/profile";
import { prepareAvatarDataUrl } from "@/lib/avatarImage";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";

interface AvatarEditDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly imageUrl: string | null;
    readonly hasOwnAvatar: boolean;
    readonly displayName: string;
}

const PREVIEW_BOX = "size-24 overflow-hidden rounded-full bg-[#1a1a1c]";
const PRIMARY_ACTION =
    "rounded-xl bg-[#f0f0f5] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#f0f0f5]/90 disabled:opacity-50";
const SECONDARY_ACTION =
    "rounded-xl border border-white/15 px-4 py-2.5 text-sm text-[#f0f0f5] transition-colors hover:bg-white/5 disabled:opacity-50";

export function AvatarEditDialog({
    open,
    onOpenChange,
    imageUrl,
    hasOwnAvatar,
    displayName,
}: AvatarEditDialogProps) {
    const { t } = useTranslation("dashboard");
    const queryClient = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    // ARCHITECT: битый signed URL помечается локально: сервер уже отдал ссылку, повторного запроса нет.
    const [brokenPreview, setBrokenPreview] = useState(false);

    const showImage = imageUrl !== null && !brokenPreview;

    // ARCHITECT: один тост на ошибку: 401 разбирает общий useAuthExpiry через useProfile, поэтому свой
    // текст был бы вторым; сбой подготовки файла имеет отдельный ключ.
    const reportError = (error: unknown): void => {
        if (error instanceof ApiError) {
            if (error.statusCode !== 401) toast.error(t("profile.avatar.error"));

            return;
        }

        toast.error(t("profile.avatar.invalid"));
    };

    const refreshProfile = async (): Promise<void> => {
        await queryClient.invalidateQueries({ queryKey: ["profile"] });
    };

    const handleFile = async (file: File | undefined): Promise<void> => {
        // ARCHITECT: in-flight гард: второй клик до завершения запроса игнорируется (§16.7).
        if (file === undefined || busy) return;

        setBusy(true);

        try {
            const dataUrl = await prepareAvatarDataUrl(file);

            await uploadAvatar(dataUrl);
            await refreshProfile();
            onOpenChange(false);
        } catch (error) {
            // ARCHITECT: при ошибке модалка остаётся открытой — так видно, что действие не прошло.
            reportError(error);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (busy) return;

        setBusy(true);

        try {
            await deleteAvatar();
            await refreshProfile();
            onOpenChange(false);
        } catch (error) {
            reportError(error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>{t("profile.avatar.dialog.title")}</DialogTitle>
                <DialogDescription>{t("profile.avatar.dialog.hint")}</DialogDescription>

                <div className="mt-5 flex justify-center">
                    <span className={cn(PREVIEW_BOX, "flex items-center justify-center")}>
                        {showImage && imageUrl !== null ? (
                            <img
                                src={imageUrl}
                                alt={t("profile.avatar.alt")}
                                title={displayName}
                                onError={() => setBrokenPreview(true)}
                                className="size-full object-cover"
                            />
                        ) : (
                            <User
                                className="size-10 text-[#f0f0f5]/40"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                        )}
                    </span>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    aria-label={t("profile.avatar.change")}
                    onChange={(event) => {
                        const file = event.target.files?.[0];

                        // ARCHITECT: сброс значения позволяет выбрать тот же файл повторно после ошибки.
                        event.target.value = "";

                        void handleFile(file);
                    }}
                />

                <DialogFooter>
                    {hasOwnAvatar && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete()}
                            className={cn(SECONDARY_ACTION, FOCUS_RING)}
                        >
                            {t("profile.avatar.remove")}
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                        className={cn(PRIMARY_ACTION, FOCUS_RING)}
                    >
                        {t("profile.avatar.upload")}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
