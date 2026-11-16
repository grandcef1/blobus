// ARCHITECT: единый кэш запросов на приложение. staleTime 30 с: данные подписки меняются только по
// действию пользователя, а переходы между экранами не должны каждый раз перезапрашивать их.
// ARCHITECT: повтор при 4xx бессмысленен — сервер уже ответил отказом, и три попытки только
// задерживают показ ошибки. Сетевой сбой (statusCode 0) и 5xx повторяются один раз.

import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";

const STALE_TIME_MS = 30_000;
const GC_TIME_MS = 300_000;
const MAX_QUERY_RETRIES = 1;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIME_MS,
            gcTime: GC_TIME_MS,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
                const isClientError =
                    error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
                if (isClientError) return false;
                return failureCount < MAX_QUERY_RETRIES;
            },
        },
        // ARCHITECT: мутации не повторяются автоматически: оплату нельзя провести дважды по своей
        // инициативе — повтор остаётся за пользователем.
        mutations: { retry: 0 },
    },
});
