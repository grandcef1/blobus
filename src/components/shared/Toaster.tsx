// ARCHITECT: единственная точка рендера тостов: монтируется один раз в корне App, поэтому
// сообщение видно и на лендинге, и внутри приложения. Длительность задаёт Radix по варианту,
// поэтому таймеры не дублируются в store; при наведении и фокусе отсчёт приостанавливается.

import { ToastPrimitive, ToastDescription, ToastRoot, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToastStore } from "@/store/toast";
import type { ToastVariant } from "@/store/toast";

const DURATION_MS: Record<ToastVariant, number> = {
    success: 3000,
    error: 5000,
    info: 4000,
};

export function Toaster() {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    return (
        <ToastPrimitive.Provider label="Уведомления" swipeDirection="right">
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
                </ToastRoot>
            ))}
            <ToastViewport />
        </ToastPrimitive.Provider>
    );
}
