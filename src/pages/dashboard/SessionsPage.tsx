// ARCHITECT: раздел «Сессии» — вход к любой остановленной теме. Поиск и фильтры не добавляю:
// их не просили, а список умещается на экране.
// ARCHITECT: список приходит через useSessions: мок-ветка читает прежний мок-источник, real-ветка —
// сводки GET /api/sessions. Параллельно они не работают, поэтому скелетон остаётся честным состоянием.
// ARCHITECT: сетка одна колонка на телефоне и две с lg — в две колонки на планшете текст начал бы переноситься.

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useSessions } from "@/hooks/useSessions";
import { createSessionActions } from "@/hooks/useSessionActions";
import { SessionsSkeleton } from "@/components/dashboard/skeletons/SessionsSkeleton";
import { FOCUS_RING, PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { SessionCard } from "./SessionCard";
import { SessionSummaryCard } from "./SessionSummaryCard";

export function SessionsPage() {
    const { t } = useTranslation("dashboard");
    const { t: tCommon } = useTranslation("common");
    const { t: tChat } = useTranslation("chat");
    const { kind, sessions, isLoading, isError, refetch } = useSessions();
    const queryClient = useQueryClient();
    const userId = useAuthStore((state) => state.user?.id ?? null);

    if (isLoading) return <SessionsSkeleton />;

    if (isError) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
                <div className="mx-auto max-w-6xl">
                    <ErrorState
                        title={tCommon("states.error.title")}
                        description={tCommon("states.error.description")}
                        retryLabel={tCommon("states.error.reload")}
                        onRetry={() => void refetch()}
                    />
                </div>
            </div>
        );
    }

    // ARCHITECT: обе ветки несут один заголовок и описание, поэтому расходятся только элементы списка:
    // мок-карточка показывает прогресс и уровень, реальная — заголовок и время плюс меню строки.
    // ARCHITECT: расходится и действие пустого состояния: у реальной ветки оно пока отсутствует
    // (мастер /session/new в реальном режиме — отдельная задача), хотя строки списка уже открывают чат.
    // ARCHITECT: действия строки реальной сессии пишут в PATCH/DELETE/reset: переименование, смена репетитора,
    // сброс и удаление — те же, что в шапке чата. Удаление уже на списке, поэтому уводить никуда не нужно.
    const items =
        kind === "mock"
            ? sessions.map((session) => <SessionCard key={session.id} session={session} />)
            : sessions.map((summary) => (
                  <SessionSummaryCard
                      key={summary.id}
                      summary={summary}
                      actions={createSessionActions({
                          sessionId: summary.id,
                          queryClient,
                          userId,
                          t: tChat,
                          tCommon,
                      })}
                  />
              ));

    return (
        <div className="min-h-[calc(100dvh-4rem)] p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-5"
                >
                    <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("sessions.title")}</h1>
                    <p className="mt-1 text-sm text-[#f0f0f5]/50">{t("sessions.subtitle")}</p>
                </motion.header>

                {sessions.length === 0 ? (
                    <EmptyState
                        icon={MessagesSquare}
                        title={tCommon("states.empty.sessions.title")}
                        description={tCommon("states.empty.sessions.description")}
                        action={
                            kind === "mock" ? (
                                <Link to="/session/new" className={cn(PRIMARY_BUTTON, FOCUS_RING)}>
                                    {tCommon("states.empty.sessions.action")}
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{items}</div>
                )}
            </div>
        </div>
    );
}
