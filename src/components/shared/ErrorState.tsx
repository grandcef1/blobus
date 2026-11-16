// ARCHITECT: отказ запроса — не пустой экран и не стек: пользователь видит, что именно не
// загрузилось, и получает действие «Повторить». role="alert" сообщает об этом скринридеру.
// ARCHITECT: children — второй сценарий выхода (например, «В обзор»): у одного компонента может
// быть два правильных действия, и второе не должно жить в отдельной копии разметки.

import type { ReactNode } from "react";
import { FOCUS_RING } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
    title: string;
    description: string;
    /** Повтор запроса: кнопка появляется только вместе с её подписью. */
    onRetry?: () => void;
    retryLabel?: string;
    /** Дополнительное действие рядом с повтором. */
    children?: ReactNode;
    className?: string;
}

const RETRY_BUTTON =
    "min-h-11 rounded-lg border border-white/15 px-4 text-sm text-[#f0f0f5] transition-colors hover:bg-white/5";

export function ErrorState({
    title,
    description,
    onRetry,
    retryLabel,
    children,
    className,
}: ErrorStateProps) {
    const hasActions = (onRetry !== undefined && retryLabel !== undefined) || children !== undefined;

    return (
        <section role="alert" className={cn("rounded-2xl bg-[#111113] p-5", className)}>
            <h2 className="text-sm font-medium text-[#f0f0f5]">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#f0f0f5]/60">{description}</p>
            {hasActions && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    {onRetry !== undefined && retryLabel !== undefined && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className={cn(RETRY_BUTTON, FOCUS_RING)}
                        >
                            {retryLabel}
                        </button>
                    )}
                    {children}
                </div>
            )}
        </section>
    );
}
