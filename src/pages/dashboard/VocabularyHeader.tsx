// ARCHITECT: шапка словаря вынесена из страницы: заголовок, счётчик и две кнопки — отдельный блок, поэтому
// тело страницы не растёт вместе с ним (§5.2). Порядок кнопок как в диалогах: вторичная слева, основная справа.

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Plus, RotateCcw } from "lucide-react";

import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface VocabularyHeaderProps {
    readonly total: number;
    readonly reviewDisabled: boolean;
    readonly onReview: () => void;
    readonly onAdd: () => void;
}

const ACTION_BUTTON =
    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-40";
const REVIEW_BUTTON = cn(
    ACTION_BUTTON,
    "bg-[#f0f0f5] font-medium text-black hover:bg-[#f0f0f5]/90"
);
const ADD_BUTTON = cn(ACTION_BUTTON, "border border-white/15 text-[#f0f0f5] hover:bg-white/5");
const ICON = "size-4";

export function VocabularyHeader({
    total,
    reviewDisabled,
    onReview,
    onAdd,
}: VocabularyHeaderProps) {
    const { t } = useTranslation("dashboard");

    return (
        <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mb-5 flex flex-wrap items-center justify-between gap-3"
        >
            <div>
                <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("vocabulary.title")}</h1>
                <p className="mt-1 text-sm text-[#f0f0f5]/50">{t("vocabulary.count", { total })}</p>
            </div>

            <div className="flex items-center gap-2">
                <button type="button" onClick={onAdd} className={cn(ADD_BUTTON, FOCUS_RING)}>
                    <Plus className={ICON} strokeWidth={1.5} aria-hidden="true" />
                    {t("vocabulary.add.title")}
                </button>

                <button
                    type="button"
                    onClick={onReview}
                    disabled={reviewDisabled}
                    className={cn(REVIEW_BUTTON, FOCUS_RING)}
                >
                    <RotateCcw className={ICON} strokeWidth={1.5} aria-hidden="true" />
                    {t("vocabulary.review.label")}
                </button>
            </div>
        </motion.header>
    );
}
