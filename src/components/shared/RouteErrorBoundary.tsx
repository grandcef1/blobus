// ARCHITECT: граница ошибок вокруг Outlet в AppLayout: падение одной страницы не должно уносить
// весь апп-шелл — сайдбар, топбар и переходы по маршрутам остаются рабочими.
// ARCHITECT: класс обязателен — componentDidCatch недоступен функциональным компонентам.
// Тексты берутся из i18n-инстанса напрямую: класс не может вызвать хук, а экран ошибки — редкое
// терминальное состояние, ради которого не стоит заводить второй компонент-обёртку.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import i18n from "@/lib/i18n";
import { APP_HOME_PATH } from "@/components/layout/navigation";
import { FOCUS_RING } from "@/lib/surfaces";
import { reportError } from "@/lib/observability/report-error";
import { cn } from "@/lib/utils";
import { ErrorState } from "./ErrorState";

interface RouteErrorBoundaryProps {
    children: ReactNode;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
}

// ARCHITECT: «В обзор» — ссылка, а не кнопка: это переход по маршруту, и он обязан работать
// средней кнопкой мыши и открываться в новой вкладке.
const OVERVIEW_LINK = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm text-[#f0f0f5]/60",
    "transition-colors hover:bg-white/5 hover:text-[#f0f0f5]",
    FOCUS_RING
);

export class RouteErrorBoundary extends Component<
    RouteErrorBoundaryProps,
    RouteErrorBoundaryState
> {
    constructor(props: RouteErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): RouteErrorBoundaryState {
        return { hasError: true };
    }

    // ARCHITECT: детали ошибки не показываются пользователю: стек — отладочная информация, ей место
    // в консоли (только dev) и в first-party отчёте наблюдаемости.
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (import.meta.env.DEV) {
            console.error("[RouteErrorBoundary]", error, errorInfo.componentStack);
        }
        reportError({
            severity: "error",
            error,
            componentStack: errorInfo.componentStack ?? undefined,
        });
    }

    private readonly handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="p-4 md:p-6">
                <div className="mx-auto max-w-3xl">
                    <ErrorState
                        title={i18n.t("states.error.title")}
                        description={i18n.t("states.error.description")}
                        onRetry={this.handleReload}
                        retryLabel={i18n.t("states.error.reload")}
                    >
                        <Link to={APP_HOME_PATH} className={OVERVIEW_LINK}>
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            {i18n.t("states.error.toOverview")}
                        </Link>
                    </ErrorState>
                </div>
            </div>
        );
    }
}
