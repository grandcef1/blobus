// ARCHITECT: действия реальной сессии — правка, сброс и удаление через api/sessions, которые ходят в
// PATCH/DELETE/POST reset. Оптимистичное обновление кэша списка и инвалидация: строка и шапка меняются сразу, а
// сервер подтверждает ответом; при сбое кэш перечитывается, поэтому интерфейс не остаётся с неправдой (§спец. 4).

import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    deleteSessionSummary,
    patchSessionSummary,
    resetSessionSummary,
} from "@/api/sessions";
import type { SessionSummaryDto, SessionSummaryPatch } from "@/api/sessions";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/store/toast";
import type { SessionActions } from "@/components/chat/header/sessionActions";

interface UseSessionActionsOptions {
    /** Что сделать после успешного сброса: чат перечитывает историю, список просто обновляет кэш. */
    readonly onReset?: () => void;
    /** Куда уйти после удаления: и чат, и строка списка ведут в список сессий. */
    readonly onRemoved?: () => void;
}

interface SessionActionsContext extends UseSessionActionsOptions {
    readonly sessionId: string;
    readonly queryClient: QueryClient;
    readonly userId: string | null;
    // ARCHITECT: ключи словаря сужены до нужных: широкий (key: string) => string не принял бы типизированный
    // t() из react-i18next, а опечатка в ключе снова стала бы ошибкой сборки.
    readonly t: (key: SessionActionMessageKey) => string;
    readonly tCommon: (key: "states.error.title") => string;
}

/** Ключи словаря, которые используют действия сессии. */
type SessionActionMessageKey =
    | "rename.toast.saved"
    | "settings.toast.tutorChanged"
    | "actions.toast.historyCleared"
    | "actions.toast.sessionDeleted";

// ARCHITECT: фабрика, а не только хук: строки списка строятся в map, где хуки запрещены. Одна реализация на
// оба места — оптимистичное обновление кэша списка и инвалидация (§спец. 4): строка и шапка меняются сразу, а
// сервер подтверждает ответом; при сбое кэш перечитывается, поэтому интерфейс не остаётся с неправдой.
export function createSessionActions(context: SessionActionsContext): SessionActions {
    const { sessionId, queryClient, userId, t, tCommon } = context;
    const cacheKey = ["sessions", userId] as const;

    const patchCache = (
        update: (previous: readonly SessionSummaryDto[]) => SessionSummaryDto[]
    ): void => {
        queryClient.setQueryData<SessionSummaryDto[]>(cacheKey, (previous) =>
            update(previous ?? [])
        );
    };

    const runPatch = async (
        patch: SessionSummaryPatch,
        optimistic: Partial<SessionSummaryDto>,
        successMessage: string
    ): Promise<void> => {
        patchCache((previous) =>
            previous.map((item) => (item.id === sessionId ? { ...item, ...optimistic } : item))
        );

        try {
            const updated = await patchSessionSummary(sessionId, patch);

            // ARCHITECT: null — сессии нет или она чужая: тоста успеха нет, список вернётся к правде в finally.
            if (updated === null) {
                toast.error(tCommon("states.error.title"));
                return;
            }

            patchCache((previous) =>
                previous.map((item) => (item.id === sessionId ? updated : item))
            );
            toast.success(successMessage);
        } catch {
            toast.error(tCommon("states.error.title"));
        } finally {
            await queryClient.invalidateQueries({ queryKey: ["sessions"] });
        }
    };

    return {
        rename: (title) => runPatch({ title }, { title }, t("rename.toast.saved")),
        changeTutor: (tutorId) =>
            runPatch({ tutorId }, { tutorId }, t("settings.toast.tutorChanged")),
        reset: async () => {
            try {
                const done = await resetSessionSummary(sessionId);

                if (!done) {
                    toast.error(tCommon("states.error.title"));
                    return;
                }

                context.onReset?.();
                toast.success(t("actions.toast.historyCleared"));
            } catch {
                toast.error(tCommon("states.error.title"));
            } finally {
                await queryClient.invalidateQueries({ queryKey: ["sessions"] });
            }
        },
        remove: async () => {
            // ARCHITECT: строку убираем из кэша сразу: список не должен показывать удалённую сессию, пока идёт
            // запрос; сбой вернёт её перечитыванием.
            patchCache((previous) => previous.filter((item) => item.id !== sessionId));

            try {
                const done = await deleteSessionSummary(sessionId);

                if (!done) {
                    toast.error(tCommon("states.error.title"));
                    return;
                }

                context.onRemoved?.();
                toast.success(t("actions.toast.sessionDeleted"));
            } catch {
                toast.error(tCommon("states.error.title"));
            } finally {
                await queryClient.invalidateQueries({ queryKey: ["sessions"] });
            }
        },
    };
}

/** Действия реальной сессии для шапки чата. */
export function useSessionActions(
    sessionId: string,
    options: UseSessionActionsOptions
): SessionActions {
    const queryClient = useQueryClient();
    const userId = useAuthStore((state) => state.user?.id ?? null);
    const { t } = useTranslation("chat");
    const { t: tCommon } = useTranslation("common");

    return createSessionActions({
        ...options,
        sessionId,
        queryClient,
        userId,
        t,
        tCommon,
    });
}
