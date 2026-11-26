// ARCHITECT: смена отображаемого имени: пустая строка — валидное состояние (схема default ''), поэтому в
// просмотре показываем общий fallback, а в поле — пустое значение. Ответ PATCH в кэш не кладём: он отдаёт
// неполный DTO (разрыв B-11), поэтому после успеха инвалидируется ["profile"].
// ARCHITECT: правка тихая: вместо крупной кнопки и формы с подписью — карандаш у имени и иконки Check/X;
// режимы сменяет AnimatePresence, при reduced-motion остаётся только проявление (смещение выключено).

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Pencil, X } from "lucide-react";

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
// ARCHITECT: обе строки одной высоты (кнопка-иконка = размер hit-area), поэтому переключение режимов
// не двигает соседний блок имени.
const NAME_ROW = "flex items-center gap-2";
const ICON_BUTTON =
    "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50";
const QUIET_BUTTON = cn(ICON_BUTTON, "text-[#f0f0f5]/30 hover:text-[#f0f0f5]/70", FOCUS_RING);
const ACTION_BUTTON = cn(ICON_BUTTON, "text-[#f0f0f5]/40 hover:text-[#f0f0f5]/80", FOCUS_RING);
const NAME_INPUT = cn(
    "w-full max-w-md border-b border-white/15 bg-transparent px-0 py-1 text-2xl font-semibold",
    "text-[#f0f0f5] transition-colors placeholder:text-[#f0f0f5]/25 focus:border-white/40 focus:outline-none md:text-3xl"
);
const ICON = "size-4";

export function ProfileNameEdit({ displayName }: ProfileNameEditProps) {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const queryClient = useQueryClient();
    const shouldReduceMotion = useReducedMotion();
    const inFlight = useRef(false);
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    // ARCHITECT: один набор анимации на оба режима: при reduced-motion shift = 0, поэтому остаётся opacity.
    const modeMotion = {
        initial: { opacity: 0, y: shouldReduceMotion ? 0 : 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: shouldReduceMotion ? 0 : -4 },
        transition: { duration: shouldReduceMotion ? 0.15 : 0.2, ease: "easeOut" as const },
    };

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

        // ARCHITECT: имя не изменилось — запрос не нужен, правка просто закрывается.
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

    return (
        <AnimatePresence mode="wait" initial={false}>
            {editing ? (
                <motion.form
                    key="edit"
                    {...modeMotion}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                    className={NAME_ROW}
                >
                    <input
                        autoFocus
                        value={value}
                        maxLength={NAME_MAX_LENGTH}
                        aria-label={t("profile.name.label")}
                        placeholder={t("profile.name.label")}
                        onChange={(event) => setValue(event.target.value)}
                        onKeyDown={(event) => {
                            // ARCHITECT: Escape отменяет правку, как в диалогах проекта.
                            if (event.key === "Escape") close();
                        }}
                        className={NAME_INPUT}
                    />

                    <button
                        type="submit"
                        disabled={busy}
                        aria-label={t("profile.name.save")}
                        className={ACTION_BUTTON}
                    >
                        {busy ? (
                            <Loader2 className={cn(ICON, "animate-spin")} aria-hidden="true" />
                        ) : (
                            <Check className={ICON} strokeWidth={1.5} aria-hidden="true" />
                        )}
                    </button>

                    <button
                        type="button"
                        disabled={busy}
                        onClick={close}
                        aria-label={t("profile.name.cancel")}
                        className={ACTION_BUTTON}
                    >
                        <X className={ICON} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                </motion.form>
            ) : (
                <motion.div key="view" {...modeMotion} className={NAME_ROW}>
                    <h2 className={NAME_CLASS}>
                        {displayName === "" ? tCommon("profile.fallbackName") : displayName}
                    </h2>

                    <button
                        type="button"
                        onClick={open}
                        aria-label={t("profile.name.change")}
                        className={QUIET_BUTTON}
                    >
                        <Pencil className={ICON} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
