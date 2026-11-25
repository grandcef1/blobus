// ARCHITECT: сводка реальной сессии: чат ещё не подключён (фаза C), поэтому карточка — не ссылка,
// а статья. Прогресс, уровень и последнее сообщение не показываем: этих данных в GET /api/sessions нет,
// а подставлять моки в реальный список нельзя.
// ARCHITECT: заголовок производный и общий с сайдбаром — getSessionTitle: логика имени и режима одна.

import { useTranslation } from "react-i18next";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { formatRelativeTime } from "@/lib/relativeTime";
import { getSessionTitle } from "@/lib/sessionTitle";
import type { SessionSummaryDto } from "@/api/sessions";

interface SessionSummaryCardProps {
    readonly summary: SessionSummaryDto;
}

export function SessionSummaryCard({ summary }: SessionSummaryCardProps) {
    const { t } = useTranslation("dashboard");
    // ARCHITECT: updatedAt основной как «последняя активность»; битую дату подменяем созданием, а не пустотой.
    const updatedAt = Date.parse(summary.updatedAt);
    const lastActivity = Number.isNaN(updatedAt) ? Date.parse(summary.createdAt) : updatedAt;

    return (
        <article className="flex items-center gap-3 rounded-2xl bg-[#111113] p-4 md:p-5">
            <BlobatarAvatar id={summary.tutorId} className="size-10 bg-[#1a1a1c]" />

            <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium text-[#f0f0f5] md:text-base">
                    {getSessionTitle(summary, t)}
                </h2>
                <p className="mt-0.5 truncate text-xs tabular-nums text-[#f0f0f5]/35">
                    {formatRelativeTime(lastActivity)}
                </p>
            </div>
        </article>
    );
}
