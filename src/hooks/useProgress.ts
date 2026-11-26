// ARCHITECT: чтение сводки прогресса — один query-хук на «Обзор» и «Профиль». Мок-ветка отдаёт фикстуру той же
// формы, real-ветка — GET /api/progress; ветки различаются одним флагом USE_MOCKS.
// ARCHITECT: union по kind здесь не нужен: обе ветки отдают один и тот же ProgressDto, поэтому экрану важно
// содержимое, а не источник. Повторы и 401 — как у остальных чтений (useSessions).

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchProgressDto } from "@/api/progress";
import type { ProgressDto } from "@/api/progress";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { USE_MOCKS } from "@/lib/env";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

// ARCHITECT: сетевые сбои и 5xx повторяем один раз; 4xx (включая 401 и 429) — нет.
const MAX_RETRIES = 1;

export interface ProgressResult {
    readonly progress: ProgressDto | null;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly refetch: () => Promise<void>;
}

function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

export function useProgress(): ProgressResult {
    const { t } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);

    const query = useQuery<ProgressDto>({
        // ARCHITECT: ключ изолирует кэш по пользователю: после перелогина чужие метрики не переиспользуются.
        queryKey: ["progress", USE_MOCKS ? "mock" : userId],
        queryFn: fetchProgressDto,
        // ARCHITECT: мок-ветка не ходит в real API, а real-ветке для запроса нужен вошедший пользователь.
        enabled: USE_MOCKS || userId !== null,
        retry: USE_MOCKS
            ? false
            : (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    });

    const { error, isSuccess } = query;
    const sessionExpired = !USE_MOCKS && error instanceof ApiError && error.statusCode === 401;

    // ARCHITECT: истёкшую сессию обрабатывает общий хук: один тост и один редирект на все read-хуки.
    useAuthExpiry(error, isSuccess);

    // ARCHITECT: прочая ошибка — один тост на переход в error (гард по ссылке error), без навигации.
    useEffect(() => {
        if (USE_MOCKS || error === null || error === undefined || sessionExpired) return;

        toast.error(t("states.error.title"));
    }, [error, sessionExpired, t]);

    return {
        progress: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        error,
        refetch: async () => {
            await query.refetch();
        },
    };
}
