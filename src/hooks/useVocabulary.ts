// ARCHITECT: чтение словаря — один query-хук на страницу. Мок-ветка отдаёт прежний мок-источник,
// real-ветка — записи GET /api/vocabulary; ветки не пересекаются и различаются ровно по USE_MOCKS.
// Истёкшую сессию обрабатывает общий useAuthExpiry: один тост и один редирект на все read-хуки.

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchReviewQueue, fetchVocabulary, fetchVocabularyEntries } from "@/api/progress";
import type { ReviewQueueItemDto, VocabularyEntryDto } from "@/api/progress";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { USE_MOCKS } from "@/lib/env";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { VocabularyWord } from "@/types/progress";

// ARCHITECT: сетевые сбои и 5xx повторяем один раз; 4xx (включая 401 и 429) — нет.
const MAX_RETRIES = 1;

interface VocabularyQueryState {
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly refetch: () => Promise<void>;
}

export interface MockVocabularyResult extends VocabularyQueryState {
    readonly kind: "mock";
    readonly words: VocabularyWord[];
}

export interface RealVocabularyResult extends VocabularyQueryState {
    readonly kind: "real";
    readonly entries: VocabularyEntryDto[];
}

export type VocabularyResult = MockVocabularyResult | RealVocabularyResult;

function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

export function useVocabulary(): VocabularyResult {
    const { t } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);

    const query = useQuery<VocabularyWord[] | VocabularyEntryDto[]>({
        // ARCHITECT: ключ изолирует кэш по пользователю: после перелогина чужие слова не переиспользуются.
        queryKey: ["vocabulary", USE_MOCKS ? "mock" : userId],
        queryFn: USE_MOCKS ? fetchVocabulary : fetchVocabularyEntries,
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

    const state: VocabularyQueryState = {
        isLoading: query.isLoading,
        isError: query.isError,
        error,
        refetch: async () => {
            await query.refetch();
        },
    };
    // ARCHITECT: приведение безопасно: queryFn ветки зафиксирован тем же USE_MOCKS, что и kind.
    const data = query.data ?? [];

    return USE_MOCKS
        ? { kind: "mock", ...state, words: data as VocabularyWord[] }
        : { kind: "real", ...state, entries: data as VocabularyEntryDto[] };
}

/** Очередь повторения: задания приходят с сервера готовыми, клиент только проверяет ответ. */
export interface ReviewQueueResult {
    readonly queue: readonly ReviewQueueItemDto[];
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly refetch: () => Promise<void>;
}

// ARCHITECT: очередь запрашивается только когда открыт режим повторения: в покое экран словаря за неё не платит,
// а задание всё равно устареет к следующему заходу. Ключ изолирован по пользователю, как у списка слов.
export function useVocabularyReview(enabled: boolean): ReviewQueueResult {
    const { t } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);

    const query = useQuery<ReviewQueueItemDto[]>({
        queryKey: ["vocabulary", "review", USE_MOCKS ? "mock" : userId],
        queryFn: fetchReviewQueue,
        enabled: enabled && (USE_MOCKS || userId !== null),
        retry: USE_MOCKS
            ? false
            : (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    });

    const { error, isSuccess } = query;
    const sessionExpired = !USE_MOCKS && error instanceof ApiError && error.statusCode === 401;

    // ARCHITECT: истёкшую сессию обрабатывает общий хук: один тост и один редирект на все read-хуки.
    useAuthExpiry(error, isSuccess);

    useEffect(() => {
        if (USE_MOCKS || error === null || error === undefined || sessionExpired) return;

        toast.error(t("states.error.title"));
    }, [error, sessionExpired, t]);

    return {
        queue: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: async () => {
            await query.refetch();
        },
    };
}
