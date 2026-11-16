// ARCHITECT: все действия подписки собраны в один хук: страница не знает об api-слое, а инвалидация
// кэша и тексты тостов описаны один раз.
// ARCHITECT: отмена и возобновление правят кэш оптимистично — статус меняется сразу, а при ошибке
// возвращается прежнее значение, поэтому интерфейс не расходится с состоянием на сервере.
// ARCHITECT: текст ошибки берётся из словаря по коду, а не из ответа сервера: сообщения бэкенда
// не переведены и не адресованы пользователю.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    cancelSubscription,
    convertTrial,
    resumeSubscription,
    retryPayment,
    scheduleDowngrade,
    startCheckout,
    undoDowngrade,
} from "@/api/billing";
import { ApiError } from "@/api/client";
import { billingKeys } from "@/api/query-keys";
import { toast } from "@/store/toast";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Subscription, SubscriptionStatus } from "@/api/billing";

export interface BillingMutations {
    checkout: UseMutationResult<void, Error, void>;
    convert: UseMutationResult<void, Error, void>;
    retry: UseMutationResult<void, Error, void>;
    downgrade: UseMutationResult<void, Error, void>;
    undoDowngrade: UseMutationResult<void, Error, void>;
    cancel: UseMutationResult<void, Error, void, OptimisticContext>;
    resume: UseMutationResult<void, Error, void, OptimisticContext>;
}

type ToastKey =
    | "toasts.checkout"
    | "toasts.convert"
    | "toasts.retry"
    | "toasts.cancel"
    | "toasts.resume"
    | "toasts.downgrade"
    | "toasts.undoDowngrade";

type ErrorKey = "toasts.paymentFailed" | "toasts.offline" | "toasts.unavailable" | "toasts.generic";

interface OptimisticContext {
    previous: Subscription | undefined;
}

const ERROR_KEYS: Readonly<Record<number, ErrorKey>> = {
    0: "toasts.offline",
    402: "toasts.paymentFailed",
    409: "toasts.unavailable",
};

function errorKey(error: Error): ErrorKey {
    return error instanceof ApiError ? (ERROR_KEYS[error.statusCode] ?? "toasts.generic") : "toasts.generic";
}

function useBillingAction(
    action: () => Promise<void>,
    successKey: ToastKey
): UseMutationResult<void, Error, void> {
    const queryClient = useQueryClient();
    const { t } = useTranslation("billing");

    return useMutation({
        mutationFn: action,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: billingKeys.all });
            toast.success(t(successKey));
        },
        onError: (error) => {
            // ARCHITECT: инвалидация нужна и при отказе: сервер мог изменить состояние до ошибки.
            void queryClient.invalidateQueries({ queryKey: billingKeys.all });
            toast.error(t("toasts.error"), t(errorKey(error)));
        },
    });
}

type StatusAction = "cancel" | "resume";

const STATUS_SUCCESS_KEYS: Readonly<Record<StatusAction, ToastKey>> = {
    cancel: "toasts.cancel",
    resume: "toasts.resume",
};

function optimisticStatus(target: StatusAction, current: Subscription): SubscriptionStatus {
    if (target === "cancel") return "scheduled_cancel";
    const trialIsRunning =
        current.trialEndsAt !== null && new Date(current.trialEndsAt).getTime() > Date.now();
    return trialIsRunning ? "trialing" : "active";
}

function useStatusAction(
    action: () => Promise<void>,
    target: StatusAction
): UseMutationResult<void, Error, void, OptimisticContext> {
    const queryClient = useQueryClient();
    const { t } = useTranslation("billing");

    return useMutation<void, Error, void, OptimisticContext>({
        mutationFn: action,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: billingKeys.subscription() });
            const previous = queryClient.getQueryData<Subscription>(billingKeys.subscription());
            queryClient.setQueryData<Subscription>(billingKeys.subscription(), (current) =>
                current === undefined
                    ? current
                    : { ...current, status: optimisticStatus(target, current) }
            );
            return { previous };
        },
        onError: (error, _variables, context) => {
            queryClient.setQueryData(billingKeys.subscription(), context?.previous);
            toast.error(t("toasts.error"), t(errorKey(error)));
        },
        onSuccess: () => toast.success(t(STATUS_SUCCESS_KEYS[target])),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: billingKeys.all });
        },
    });
}

export function useBillingMutations(): BillingMutations {
    return {
        checkout: useBillingAction(startCheckout, "toasts.checkout"),
        convert: useBillingAction(convertTrial, "toasts.convert"),
        retry: useBillingAction(retryPayment, "toasts.retry"),
        downgrade: useBillingAction(scheduleDowngrade, "toasts.downgrade"),
        undoDowngrade: useBillingAction(undoDowngrade, "toasts.undoDowngrade"),
        cancel: useStatusAction(cancelSubscription, "cancel"),
        resume: useStatusAction(resumeSubscription, "resume"),
    };
}
