// ARCHITECT: чтение собственной строки профиля — один query-хук: идентичность и локале-зависимый лейбл
// даты живут здесь, поэтому страница остаётся тонкой. 401 терминальный (apiFetch уже пытался refresh):
// реакция одна — очистка локальной сессии, тост и редирект на /login.

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchProfile } from "@/api/profile";
import type { ProfileDto } from "@/api/profile";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

// ARCHITECT: 404 — гонка триггера handle_new_user сразу после signup: повторяем дважды с паузой.
const RETRY_DELAY_MS = 800;
// ARCHITECT: 3 с — время прочитать тост перед уходом на /login.
const REDIRECT_DELAY_MS = 3000;

export interface ProfileQueryResult {
    readonly profile: ProfileDto | undefined;
    readonly memberSinceLabel: string;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly refetch: () => Promise<void>;
}

// ARCHITECT: гард модульный — несколько потребителей хука не дают двойной тост и двойной таймер.
// Сбрасывается при успешной загрузке и при размонтировании: новый экран начинает новый эпизод.
let sessionExpiredHandled = false;

/** Метка даты регистрации: формат локале-зависимый («месяц год»), первая буква — заглавная. */
function formatMemberSince(iso: string, language: string): string {
    const label = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
        new Date(iso)
    );

    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function useProfile(): ProfileQueryResult {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);
    const redirectTimer = useRef<number | null>(null);

    const query = useQuery({
        // ARCHITECT: id в ключе не даёт кэшу показать профиль предыдущего аккаунта после перелогина.
        queryKey: ["profile", userId],
        queryFn: fetchProfile,
        // ARCHITECT: глобальный дефолт QueryClient переопределяется явно: 404 — гонка handle_new_user,
        // во время повторов запрос остаётся pending, поэтому страница показывает скелетон. 429/500/сеть
        // авто-повтора не получают.
        retry: (failureCount, error) =>
            error instanceof ApiError && error.statusCode === 404 && failureCount < 2,
        retryDelay: RETRY_DELAY_MS,
    });

    const { error, isSuccess } = query;
    const sessionExpired = error instanceof ApiError && error.statusCode === 401;

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

    // ARCHITECT: прочая ошибка — один тост на переход в error (гард по ссылке error), без навигации;
    // длительности — дефолты тостера.
    useEffect(() => {
        if (error === null || error === undefined || sessionExpired) return;

        toast.error(t("states.error.title"));
    }, [error, sessionExpired, t]);

    // ARCHITECT: таймер и гард снимаются при размонтировании: повторный 401/refetch не сбрасывает уже
    // запланированный редирект.
    useEffect(
        () => () => {
            if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
            sessionExpiredHandled = false;
        },
        []
    );

    return {
        profile: query.data,
        memberSinceLabel: query.data
            ? formatMemberSince(query.data.memberSince, i18n.language)
            : "",
        isLoading: query.isLoading,
        isError: query.isError,
        error,
        refetch: async () => {
            await query.refetch();
        },
    };
}
