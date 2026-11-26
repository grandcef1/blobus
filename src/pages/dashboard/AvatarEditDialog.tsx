// ARCHITECT: модалка правки аватара: смена и удаление живут здесь, потому что в карточке профиля для них
// осталось только затемнение на ховере. Логика без ослабления: busy-гард на время активного действия,
// инвалидация ["profile"] после успеха, 401 молчит (разбирает общий useAuthExpiry).
// ARCHITECT: выбор файла открывает шаг кропа — сервер получает уже обрезанный квадрат, а blob-URL файла
// освобождается, когда шаг кропа закрывается (иначе blob до 8 МБ живёт до выгрузки документа).
// ARCHITECT: закрытие модалки любой причиной (Escape, крестик, успех) возвращает шаг выбора; невалидный файл
// и ошибка загрузки оставляют текущий шаг открытым (можно взять другой файл или переприменить рамку); сброс
// значения файлового input позволяет выбрать тот же файл повторно.
// ARCHITECT: удаление и загрузка идут одним путём (runAction): гард, тост, инвалидация и закрытие не дублируются.

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, User } from "lucide-react";

import { ApiError } from "@/api/client";
import { deleteAvatar, uploadAvatar } from "@/api/profile";
import { decodeAvatarFile, releaseAvatarSource } from "@/lib/avatarImage";
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
import { AvatarCropEditor } from "./AvatarCropEditor";

interface AvatarEditDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly imageUrl: string | null;
    readonly hasOwnAvatar: boolean;
    readonly displayName: string;
}

const PREVIEW_BOX = "size-24 overflow-hidden rounded-full bg-[#1a1a1c]";
const ACTION =
    "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50";
const PRIMARY_ACTION = cn(ACTION, "bg-[#f0f0f5] font-medium text-black hover:bg-[#f0f0f5]/90");
const SECONDARY_ACTION = cn(ACTION, "border border-white/15 text-[#f0f0f5] hover:bg-white/5");
// ARCHITECT: превью шага выбора и спиннер активного действия — константами: один вид, меньше разметки.
const IDLE_PREVIEW = cn(PREVIEW_BOX, "mx-auto mt-5 flex items-center justify-center");
const SPINNER = <Loader2 className="size-4 animate-spin" aria-hidden="true" />;

/** Активное действие: спиннер ставится на свою кнопку, а гард один на все действия. */
type BusyAction = "upload" | "delete";

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
    const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
    const [pendingImage, setPendingImage] = useState<HTMLImageElement | null>(null);
    // ARCHITECT: битый signed URL помечается локально: сервер уже отдал ссылку, повторного запроса нет.
    const [brokenPreview, setBrokenPreview] = useState(false);

    const showImage = imageUrl !== null && !brokenPreview;
    const busy = busyAction !== null;

    // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
    const reportError = (error: unknown): void => {
        if (error instanceof ApiError) {
            if (error.statusCode !== 401) toast.error(t("profile.avatar.error"));
            return;
        }

        toast.error(t("profile.avatar.invalid"));
    };

    const leaveCrop = (): void => {
        if (pendingImage !== null) releaseAvatarSource(pendingImage);
        setPendingImage(null);
    };

    const handleOpenChange = (next: boolean): void => {
        if (!next) leaveCrop();
        onOpenChange(next);
    };

    const handleFile = async (file: File | undefined): Promise<void> => {
        // ARCHITECT: in-flight гард: второй выбор файла до завершения декодирования игнорируется (§16.7).
        if (file === undefined || busy) return;

        try {
            setPendingImage(await decodeAvatarFile(file));
        } catch (error) {
            // ARCHITECT: невалидный файл оставляет шаг выбора открытым — можно взять другой файл.
            reportError(error);
        }
    };

    // ARCHITECT: удаление и загрузка идут одним путём: гард, тост, инвалидация и закрытие не дублируются.
    const runAction = async (action: BusyAction, mutate: () => Promise<unknown>): Promise<void> => {
        if (busy) return;

        setBusyAction(action);

        try {
            await mutate();
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
            handleOpenChange(false);
        } catch (error) {
            // ARCHITECT: при ошибке модалка остаётся открытой — так видно, что действие не прошло.
            reportError(error);
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogTitle>{t("profile.avatar.dialog.title")}</DialogTitle>
                <DialogDescription>{t("profile.avatar.dialog.hint")}</DialogDescription>

                {pendingImage !== null ? (
                    <AvatarCropEditor
                        image={pendingImage}
                        applying={busyAction === "upload"}
                        onApply={(dataUrl) => void runAction("upload", () => uploadAvatar(dataUrl))}
                        onCancel={leaveCrop}
                    />
                ) : (
                    <>
                        <div className={IDLE_PREVIEW}>
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
                        </div>

                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className="sr-only"
                            aria-label={t("profile.avatar.change")}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                void handleFile(file);
                            }}
                        />

                        <DialogFooter>
                            {hasOwnAvatar && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    aria-busy={busyAction === "delete"}
                                    onClick={() => void runAction("delete", deleteAvatar)}
                                    className={cn(SECONDARY_ACTION, FOCUS_RING)}
                                >
                                    {busyAction === "delete" && SPINNER}
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
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
