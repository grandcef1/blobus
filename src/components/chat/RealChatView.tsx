// ARCHITECT: реальный чат: сессия и её репетитор читаются из GET /api/sessions (общий кэш со списком сессий),
// а лента строится из SSE-потока useChat. Истории с сервера нет — сообщения живут в состоянии страницы, как и
// в мок-режиме, где они лежат в памяти хранилища.
// ARCHITECT: в шапке есть меню сессии: переименование и смена репетитора идут в PATCH /api/sessions/:id, сброс —
// в POST /api/sessions/:id/reset, удаление — в DELETE. Прогресс не показывается: его нет в сводке сессии.

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { fetchSessionSummaries } from "@/api/sessions";
import { fetchSettings } from "@/api/settings";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatNotFound } from "@/components/chat/ChatNotFound";
import { RealChatFeed } from "@/components/chat/RealChatFeed";
import { ChatSkeleton } from "@/components/dashboard/skeletons/ChatSkeleton";
import { useAuthExpiry } from "@/hooks/useAuthExpiry";
import { useChat } from "@/hooks/useChat";
import { useProgress } from "@/hooks/useProgress";
import { useSessionActions } from "@/hooks/useSessionActions";
import { getModeLabelKey } from "@/lib/sessionTitle";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import type { EnhancedChatSession } from "@/types/session";

const CHAT_HEIGHT = "h-[calc(100dvh-3.5rem)] md:h-dvh";
// ARCHITECT: сетевые сбои и 5xx повторяем один раз; 4xx (включая 401 и 429) — нет, как у остальных чтений.
const MAX_RETRIES = 1;

function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500;
}

export function RealChatView() {
    const { sessionId = "" } = useParams<{ sessionId: string }>();
    const { t } = useTranslation("dashboard");
    const navigate = useNavigate();
    const userId = useAuthStore((state) => state.user?.id ?? null);
    // ARCHITECT: ключ ["sessions", userId] тот же, что у списка сессий: переход из списка в чат не делает
    // второй запрос, а созданная сессия появляется в кэше после инвалидации на шаге мастера.
    const { data, isLoading, error, isSuccess } = useQuery({
        queryKey: ["sessions", userId],
        queryFn: fetchSessionSummaries,
        enabled: userId !== null,
        retry: (failureCount, failure) => !isClientError(failure) && failureCount < MAX_RETRIES,
    });

    useAuthExpiry(error, isSuccess);

    // ARCHITECT: ключ ["settings"] тот же, что у страницы настроек: переход между экранами не делает второй
    // запрос, а переключатель озвучки в настройках виден чату без перезагрузки страницы.
    const { data: settings } = useQuery({
        queryKey: ["settings"],
        queryFn: fetchSettings,
        enabled: userId !== null,
    });

    const chat = useChat(sessionId);
    // ARCHITECT: уровень нужен карточке исправления: на A1-A2 под примерами показывается перевод. Он берётся из
    // той же сводки прогресса, что и на других экранах — отдельного запроса чат не делает.
    const { progress } = useProgress();
    // ARCHITECT: ответ на задание идёт отдельным вызовом, а вторая часть хода встаёт в ленту сама: странице
    // нечего хранить между репликами, поэтому выбранный ответ здесь не живёт (§спец. 3).
    // ARCHITECT: действия сессии — реальные: PATCH/DELETE/reset с оптимистичным кэшем и инвалидацией. Сброс
    // перечитывает историю (в ней уже новое приветствие), удаление уводит в список сессий.
    const actions = useSessionActions(sessionId, {
        onReset: chat.kind === "real" ? chat.reload : undefined,
        onRemoved: () => navigate("/app/sessions"),
    });

    // ARCHITECT: ветку выбирает страница по USE_MOCKS, поэтому сюда мок-состояние не попадает: скелетон —
    // защита от рассинхронизации флага и вида, а не ожидаемая ветка.
    if (chat.kind === "mock" || isLoading || userId === null) return <ChatSkeleton />;

    const summary = (data ?? []).find((item) => item.id === sessionId);

    if (summary === undefined) return <ChatNotFound />;

    const tutor = getBlobatarById(summary.tutorId);
    const modeKey = getModeLabelKey(summary.mode);
    const session: EnhancedChatSession = {
        id: summary.id,
        userId,
        // ARCHITECT: своё название пользователя, иначе имя репетитора: подпись под заголовком — режим.
        title: summary.title ?? tutor?.name ?? t("sessions.card.tutorFallback"),
        createdAt: Date.parse(summary.createdAt),
        repetitorId: summary.tutorId,
        learningMode: summary.mode,
        progress: { completedLessons: 0, totalLessons: 0, wordsLearned: 0, streakDays: 0 },
        lastActivityAt: Date.parse(summary.updatedAt),
        messages: [],
    };

    return (
        <div className={cn("relative flex min-h-0 flex-col overflow-hidden bg-black", CHAT_HEIGHT)}>
            <ChatHeader
                session={session}
                actions={actions}
                showProgress={false}
                subtitle={modeKey === null ? summary.mode : t(modeKey)}
            />
            <RealChatFeed
                messages={chat.messages}
                session={session}
                plan={chat.plan}
                isStreaming={chat.isStreaming}
                isAwaitingFollowUp={chat.isAwaitingFollowUp}
                error={chat.error}
                messagesRemaining={chat.messagesRemaining}
                isLoading={chat.isLoading}
                voiceEnabled={settings?.preferences.voiceEnabled ?? false}
                proPlan={settings?.plan === "pro"}
                level={progress?.level ?? null}
                onRetry={chat.retry}
                onStop={chat.stop}
                onQuizAnswered={chat.answerQuiz}
            />
            <ChatInput disabled={chat.isStreaming} onSend={chat.send} />
        </div>
    );
}
