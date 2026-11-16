// ARCHITECT: офлайн — состояние сети, а не ошибка экрана: баннер сообщает его ненавязчиво, полосой
// сверху, и не перекрывает контент. role="status" объявляет смену, не перебивая чтение страницы.
// ARCHITECT: смысл несёт текст с иконкой; цвет остаётся монохромным, как и вся поверхность.

import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export function OfflineBanner() {
    const { t } = useTranslation();

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-white/5 bg-black/85 px-4 py-2 backdrop-blur-xl"
        >
            <WifiOff className="size-3.5 shrink-0 text-[#f0f0f5]/60" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#f0f0f5]/70">{t("offline.message")}</p>
        </div>
    );
}
