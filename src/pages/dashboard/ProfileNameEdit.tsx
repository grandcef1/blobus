// ARCHITECT: смена отображаемого имени: пустая строка — валидное состояние (схема default ''), поэтому в
// просмотре показываем общий fallback, а в поле — пустое значение. Ответ PATCH в кэш не кладём: он отдаёт
// неполный DTO (известный разрыв, чинится B-11), поэтому после успеха инвалидируется ["profile"].

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import { ApiError } from "@/api/client";
import { updateProfile } from "@/api/profile";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";

interface ProfileNameEditProps {
    readonly displayName: string;
}

const NAME_CLASS = "text-2xl font-semibold text-[#f0f0f5] md:text-3xl";
// ARCHITECT: 80 — граница CHECK-а схемы: длиннее сервер всё равно отклонит.
const NAME_MAX_LENGTH = 80;
const ACTION_BUTTON =
    "flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-[#f0f0f5] transition-colors hover:bg-white/5 disabled:opacity-50";

export function ProfileNameEdit({ displayName }: ProfileNameEditProps) {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const queryClient = useQueryClient();
    const inFlight = useRef(false);
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    const open = (): void => {
        // ARCHITECT: при пустом имени поле открывается пустым: fallback — подпись, а не значение.
        setValue(displayName);
        setEditing(true);
    };

    const close = (): void => {
        setEditing(false);
    };

    const save = async (): Promise<void> => {
        // ARCHITECT: in-flight гард: повторный Enter/клик до ответа сервера игнорируется (§16.7).
        if (inFlight.current) return;

        const trimmed = value.trim();

        // ARCHITECT: имя не изменилось — запрос не нужен, форма просто закрывается.
        if (trimmed === displayName) {
            close();
            return;
        }

        inFlight.current = true;
        setBusy(true);

        try {
            await updateProfile({ displayName: trimmed });
            await queryClient.invalidateQueries({ queryKey: ["profile"] });
            close();
        } catch (error) {
            // ARCHITECT: 401 разбирает общий useAuthExpiry через useProfile — свой тост был бы вторым.
            if (!(error instanceof ApiError && error.statusCode === 401)) {
                toast.error(t("profile.name.error"));
            }
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    };

    if (!editing) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <h2 className={NAME_CLASS}>
                    {displayName === "" ? tCommon("profile.fallbackName") : displayName}
                </h2>

                <button type="button" onClick={open} className={cn(ACTION_BUTTON, FOCUS_RING)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    {t("profile.name.change")}
                </button>
            </div>
        );
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
            className="flex flex-col gap-2"
        >
            <label className="text-xs text-[#f0f0f5]/50" htmlFor="profile-name-input">
                {t("profile.name.label")}
            </label>

            <input
                id="profile-name-input"
                autoFocus
                value={value}
                maxLength={NAME_MAX_LENGTH}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                    // ARCHITECT: Escape отменяет правку, как в диалогах проекта.
                    if (event.key === "Escape") close();
                }}
                className="min-h-11 w-full max-w-md rounded-lg bg-[#141416] px-3 text-sm text-[#f0f0f5] focus:outline-none focus:ring-2 focus:ring-[#f0f0f5]/20"
            />

            <div className="flex flex-wrap items-center gap-2">
                <button type="submit" disabled={busy} className={cn(ACTION_BUTTON, FOCUS_RING)}>
                    {t("profile.name.save")}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={close}
                    className={cn(ACTION_BUTTON, FOCUS_RING)}
                >
                    {t("profile.name.cancel")}
                </button>
            </div>
        </form>
    );
}
