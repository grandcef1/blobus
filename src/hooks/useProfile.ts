// ARCHITECT: чтение собственной строки профиля — один query-хук: идентичность и локале-зависимый лейбл
// даты живут здесь, поэтому страница остаётся тонкой. Истёкшую сессию обрабатывает общий useAuthExpiry:
// один тост и один редирект на все read-хуки страницы.

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/api/client";
import { fetchProfile } from "@/api/profile";
import type { ProfileDto } from "@/api/profile";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";

// ARCHITECT: 404 — гонка триггера handle_new_user сразу после signup: повторяем дважды с паузой.
const RETRY_DELAY_MS = 800;

export interface ProfileQueryResult {
    readonly profile: ProfileDto | undefined;
    readonly memberSinceLabel: string;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly error: unknown;
    readonly refetch: () => Promise<void>;
}

export interface ProfileQueryOptions {
    /** Тихий режим: фоновая карточка пользователя не поднимает тост об ошибке — его покажет страница. */
    readonly silent?: boolean;
}

/** Метка даты регистрации: формат локале-зависимый («месяц год»), первая буква — заглавная. */
function formatMemberSince(iso: string, language: string): string {
    const label = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
        new Date(iso)
    );

    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function useProfile(options: ProfileQueryOptions = {}): ProfileQueryResult {
    const { t, i18n } = useTranslation();
    const userId = useAuthStore((state) => state.user?.id ?? null);

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

    // ARCHITECT: истёкшую сессию обрабатывает общий хук: один тост и один редирект на все read-хуки.
    useAuthExpiry(error, isSuccess);

    // ARCHITECT: прочая ошибка — один тост на переход в error (гард по ссылке error), без навигации;
    // длительности — дефолты тостера. Тихий режим (карточка сайдбара на каждом экране) тост не поднимает.
    useEffect(() => {
        if (options.silent || error === null || error === undefined || sessionExpired) return;

        toast.error(t("states.error.title"));
    }, [error, options.silent, sessionExpired, t]);

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
