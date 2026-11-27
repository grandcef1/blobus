// ARCHITECT: аватар профиля: своя картинка → картинка Google → иконка User. Саму цепочку и замену битого
// источника держит общий UserAvatar: тот же вид у рельсы и мобильной шапки, поэтому «где какой аватар»
// решается в одном месте. Signed URL приходит только из GET профиля, поэтому после upload/delete
// инвалидируется ["profile"], а ответ мутации для показа не используется. Логика правки живёт в
// AvatarEditDialog: карточка держит показ и открытие модалки.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { AvatarEditDialog } from "./AvatarEditDialog";

interface ProfileAvatarProps {
    readonly avatarUrl: string | null;
    readonly providerAvatarUrl: string | null;
    readonly displayName: string;
}

const AVATAR_BOX =
    "group relative size-16 shrink-0 overflow-hidden rounded-full bg-[#1a1a1c] md:size-24";
// ARCHITECT: затемнение живёт на самой кнопке-оверлее: hover группы и focus-within дают один и тот же вид
// для мыши и клавиатуры; на тач-устройствах оверлей просто всегда кликабелен — тап открывает модалку.
const OVERLAY = cn(
    "absolute inset-0 flex items-center justify-center rounded-full bg-black/0",
    "transition-colors group-hover:bg-black/55 group-focus-within:bg-black/55",
    FOCUS_RING
);
const OVERLAY_ICON =
    "size-5 text-[#f0f0f5] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";

export function ProfileAvatar({ avatarUrl, providerAvatarUrl, displayName }: ProfileAvatarProps) {
    const { t } = useTranslation("dashboard");
    const [open, setOpen] = useState(false);

    // ARCHITECT: превью диалога показывает ровно ту же ссылку, что карточка: цепочка одна.
    const source = avatarUrl ?? providerAvatarUrl;

    return (
        <>
            <div className={AVATAR_BOX}>
                <UserAvatar
                    avatarUrl={avatarUrl}
                    providerAvatarUrl={providerAvatarUrl}
                    displayName={displayName}
                    className="size-full"
                    iconClassName="size-8 md:size-10"
                />

                <button
                    type="button"
                    aria-label={t("profile.avatar.change")}
                    onClick={() => setOpen(true)}
                    className={OVERLAY}
                >
                    <Pencil className={OVERLAY_ICON} strokeWidth={1.5} aria-hidden="true" />
                </button>
            </div>

            <AvatarEditDialog
                open={open}
                onOpenChange={setOpen}
                imageUrl={source}
                hasOwnAvatar={avatarUrl !== null}
                displayName={displayName}
            />
        </>
    );
}
