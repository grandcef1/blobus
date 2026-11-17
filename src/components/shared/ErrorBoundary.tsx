// ARCHITECT: Class component is required by React for componentDidCatch.
// ARCHITECT: граница ставится выше BrowserRouter в App.tsx: если упадёт сам роутер или любая
// страница, пользователь увидит этот экран вместо белого листа, а консоль — только в dev.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import i18n from "@/lib/i18n";
import { reportError } from "@/lib/observability/report-error";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    // ARCHITECT: детали ошибки (стек, компонентный трассировщик) не показываются пользователю:
    // это отладочная информация, ей место в консоли и только в dev-сборке.
    // ARCHITECT: в прод-сборке падение страницы уходит в first-party отчёт: это единственный
    // сигнал о том, что экран сломался у пользователя.
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (import.meta.env.DEV) {
            console.error("[ErrorBoundary]", error, errorInfo.componentStack);
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

    // ARCHITECT: граница ошибок классовая, хук ей недоступен, поэтому ключи резолвит синглтон в
    // момент рендера экрана ошибки.
    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
                    <div className="flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
                        <span className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                            <AlertTriangle className="size-6 text-white/70" aria-hidden="true" />
                        </span>
                        <h1 className="mt-6 text-xl font-semibold text-white">
                            {i18n.t("errors.boundary.title", { ns: "common" })}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-white/50">
                            {i18n.t("errors.boundary.description", { ns: "common" })}
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="mt-8 inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        >
                            {i18n.t("errors.boundary.reload", { ns: "common" })}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}