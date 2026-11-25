// ARCHITECT: чтение списка сессий — один query-хук на страницу. Мок-ветка отдаёт прежний мок-источник,
// real-ветка — сводки GET /api/sessions; ветки не пересекаются и различаются ровно по USE_MOCKS.
// ARCHITECT: 401 терминальный (apiFetch уже пытался refresh): реакция одна — очистка сессии, тост и
// редирект на /login. Общий обработчик истёкшей сессии — отдельный долг, useProfile не рефакторим.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchSessionSummaries, fetchSessions } from "@/api/sessions";
import type { SessionSummaryDto } from "@/api/sessions";
import { USE_MOCKS } from "@/lib/env";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { EnhancedChatSession } from "@/types/session";

// ARCHITECT: 3 с — время прочитать тост перед уходом на /login.
const REDIRECT_DELAY_MS = 3000;
// ARCHITECT: сетевые сбои и 5xx повторяем один раз; 4xx (включая 401 и 429) — нет.
const MAX_RETRIES = 1;

interface SessionsQueryState {
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly refetch: () => Promise<void>;
}

export interface MockSessionsResult extends SessionsQueryState {
    readonly kind: "mock";
    readonly sessions: EnhancedChatSession[];
}

export interface RealSessionsResult extends SessionsQueryState {
    readonly kind: "real";
    readonly sessions: SessionSummaryDto[];
}

export type SessionsResult = MockSessionsResult | RealSessionsResult;

// ARCHITECT: гард модульный — несколько потребителей хука не дают двойной тост и двойной таймер.
// Сбрасывается при успешной загрузке и при размонтировании: новый экран начинает новый эпизод.
let sessionExpiredHandled = false;

function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

export function useSessions(): SessionsResult {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);
    const redirectTimer = useRef<number | null>(null);

    const query = useQuery<EnhancedChatSession[] | SessionSummaryDto[]>({
        // ARCHITECT: ключ изолирует кэш по пользователю: после перелогина чужие сессии не переиспользуются.
        queryKey: ["sessions", USE_MOCKS ? "mock" : userId],
        queryFn: USE_MOCKS ? fetchSessions : fetchSessionSummaries,
        // ARCHITECT: мок-ветка не ходит в real API, а real-ветке для запроса нужен вошедший пользователь.
        enabled: USE_MOCKS || userId !== null,
        retry: USE_MOCKS
            ? false
            : (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    });

    const { error, isSuccess } = query;
    const sessionExpired = !USE_MOCKS && error instanceof ApiError && error.statusCode === 401;

    useEffect(() => {
        if (isSuccess) sessionExpiredHandled = false;
    }, [isSuccess]);

    // ARCHITECT: setState до навигации, иначе /login редиректит вошедшего обратно; signOut не вызываем —
    // сеть на мёртвой сессии уже не нужна.
    useEffect(() => {
        if (!sessionExpired || sessionExpiredHandled) return;

        sessionExpiredHandled = true;
        useAuthStore.setState({ user: null });
        toast.error(t("errors.sessionExpired"));
        redirectTimer.current = window.setTimeout(() => {
            navigate("/login", { replace: true });
        }, REDIRECT_DELAY_MS);
    }, [sessionExpired, navigate, t]);

    // ARCHITECT: прочая ошибка — один тост на переход в error (гард по ссылке error), без навигации.
    useEffect(() => {
        if (USE_MOCKS || error === null || error === undefined || sessionExpired) return;

        toast.error(t("states.error.title"));
    }, [error, sessionExpired, t]);

    // ARCHITECT: таймер и гард снимаются при размонтировании: повторный 401 или refetch не сбрасывает
    // уже запланированный редирект.
    useEffect(
        () => () => {
            if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
            sessionExpiredHandled = false;
        },
        []
    );

    const state: SessionsQueryState = {
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
        ? { kind: "mock", ...state, sessions: data as EnhancedChatSession[] }
        : { kind: "real", ...state, sessions: data as SessionSummaryDto[] };
}
