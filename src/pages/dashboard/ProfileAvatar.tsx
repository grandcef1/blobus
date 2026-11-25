// ARCHITECT: аватар профиля: своя картинка → картинка Google → иконка User. Signed URL приходит только
// из GET профиля, поэтому после upload/delete инвалидируется ["profile"], а ответ мутации для показа не
// используется. Ресайз и снятие EXIF живут в lib/avatarImage.

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

interface ProfileAvatarProps {
    readonly avatarUrl: string | null;
    readonly providerAvatarUrl: string | null;
    readonly displayName: string;
}

const AVATAR_BOX = "size-16 shrink-0 rounded-full bg-[#1a1a1c] md:size-24";
const ACTION_BUTTON =
    "min-h-11 rounded-lg border border-white/15 px-3 text-sm text-[#f0f0f5] transition-colors hover:bg-white/5 disabled:opacity-50";

export function ProfileAvatar({ avatarUrl, providerAvatarUrl, displayName }: ProfileAvatarProps) {
    const { t } = useTranslation("dashboard");
    const queryClient = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [brokenSource, setBrokenSource] = useState<string | null>(null);

    const source = avatarUrl ?? providerAvatarUrl;
    const showImage = source !== null && source !== brokenSource;

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
        } catch (error) {
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
        } catch (error) {
            reportError(error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 sm:items-start">
            {showImage && source !== null ? (
                <img
                    src={source}
                    alt={t("profile.avatar.alt")}
                    title={displayName}
                    onError={() => setBrokenSource(source)}
                    className={cn(AVATAR_BOX, "object-cover")}
                />
            ) : (
                <span className={cn(AVATAR_BOX, "flex items-center justify-center")}>
                    <User
                        className="size-8 text-[#f0f0f5]/40 md:size-10"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </span>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    className={cn(ACTION_BUTTON, FOCUS_RING)}
                >
                    {t("profile.avatar.change")}
                </button>

                {avatarUrl !== null && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete()}
                        className={cn(ACTION_BUTTON, FOCUS_RING)}
                    >
                        {t("profile.avatar.remove")}
                    </button>
                )}

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
            </div>
        </div>
    );
}
