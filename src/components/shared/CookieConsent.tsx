// ARCHITECT: баннер согласия — полоса внизу, а не модальная стена: лендинг остаётся читаемым и
// кликабельным, решение можно принять в любой момент. Показывается только пока решения не было
// (decidedAt === null) — то есть до согласия и после его отзыва.
// ARCHITECT: aria-live="polite" объявляет баннер скринридеру при появлении, но не перебивает чтение
// страницы; оба действия — обычные кнопки с плашкой касания 44px и видимым фокусом.

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { useConsentStore } from "@/store/consent";

const ACCEPT_ALL = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[#f0f0f5] px-6 text-sm font-medium text-black",
    "transition-colors hover:bg-[#f0f0f5]/90",
    FOCUS_RING
);

const ACCEPT_NECESSARY = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[#f0f0f5]/25 px-6 text-sm text-[#f0f0f5]",
    "transition-colors hover:border-[#f0f0f5]/50 hover:bg-[#f0f0f5]/10",
    FOCUS_RING
);

export function CookieConsent() {
    const { t } = useTranslation();
    const decidedAt = useConsentStore((state) => state.decidedAt);
    const acceptAll = useConsentStore((state) => state.acceptAll);
    const acceptNecessary = useConsentStore((state) => state.acceptNecessary);

    if (decidedAt !== null) return null;

    return (
        <motion.div
            role="region"
            aria-label={t("consent.regionLabel")}
            aria-live="polite"
            // ARCHITECT: 250ms easeOut — движение заметно, но не задерживает: transform гасится
            // глобальным MotionConfig reducedMotion="user", если система просит меньше движения.
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-black/85 backdrop-blur-xl"
        >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-[#f0f0f5]">{t("consent.title")}</p>
                    <p className="max-w-2xl text-xs leading-relaxed text-[#f0f0f5]/60">
                        {t("consent.description")}
                    </p>
                    <Link
                        to="/cookies"
                        className={cn(
                            "w-fit text-xs text-[#f0f0f5]/60 underline transition-colors hover:text-[#f0f0f5] hover:no-underline",
                            FOCUS_RING
                        )}
                    >
                        {t("consent.details")}
                    </Link>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button type="button" onClick={acceptAll} className={ACCEPT_ALL}>
                        {t("consent.acceptAll")}
                    </button>
                    <button type="button" onClick={acceptNecessary} className={ACCEPT_NECESSARY}>
                        {t("consent.acceptNecessary")}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
