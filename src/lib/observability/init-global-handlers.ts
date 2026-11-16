// ARCHITECT: источники ошибок, о которых React не знает: "error" (необработанные исключения),
// "unhandledrejection" (отклонённые промисы) и "vite:preloadError" (чанк устарел после новой
// сборки). Обработчики ставит один раз main.tsx, возвращённая функция их снимает.
// ARCHITECT: падение загрузки чанка лечится перезагрузкой, поэтому сообщение даёт действие, а не
// только текст.

import i18n from "@/lib/i18n";
import { reportError } from "@/lib/observability/report-error";
import { toast } from "@/store/toast";

export function initGlobalHandlers(): () => void {
    const onError = (event: ErrorEvent): void => {
        reportError({ severity: "error", error: event.error ?? event.message });
    };

    const onRejection = (event: PromiseRejectionEvent): void => {
        reportError({ severity: "error", error: event.reason });
    };

    const onPreloadError = (event: Event): void => {
        reportError({ severity: "error", error: event, message: "Chunk load failed" });
        toast.error(
            i18n.t("errors.updateAvailable.title"),
            i18n.t("errors.updateAvailable.description"),
            {
                label: i18n.t("errors.updateAvailable.action"),
                onClick: () => window.location.reload(),
            }
        );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("vite:preloadError", onPreloadError);

    return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
        window.removeEventListener("vite:preloadError", onPreloadError);
    };
}
