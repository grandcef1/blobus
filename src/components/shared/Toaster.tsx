// ARCHITECT: единственная точка рендера тостов: монтируется один раз в корне App, поэтому
// сообщение видно и на лендинге, и внутри приложения. Длительность задаёт Radix по варианту,
// поэтому таймеры не дублируются в store; при наведении и фокусе отсчёт приостанавливается.

import { useTranslation } from "react-i18next";
import { ToastPrimitive, ToastDescription, ToastRoot, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToastStore } from "@/store/toast";
import type { ToastVariant } from "@/store/toast";

const DURATION_MS: Record<ToastVariant, number> = {
    success: 3000,
    error: 5000,
    info: 4000,
};

export function Toaster() {
    const { t } = useTranslation("common");
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    return (
        <ToastPrimitive.Provider label={t("notifications.label")} swipeDirection="right">
            {toasts.map((item) => (
                <ToastRoot
                    key={item.id}
                    open
                    variant={item.variant}
                    duration={DURATION_MS[item.variant]}
                    onOpenChange={(next) => {
                        if (!next) dismiss(item.id);
                    }}
                >
                    <ToastTitle>{item.title}</ToastTitle>
                    {item.description && <ToastDescription>{item.description}</ToastDescription>}
                    {item.action && (
                        <button
                            type="button"
                            onClick={item.action.onClick}
                            className="mt-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-[#f0f0f5]/70 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                        >
                            {item.action.label}
                        </button>
                    )}
                </ToastRoot>
            ))}
            <ToastViewport />
        </ToastPrimitive.Provider>
    );
}
