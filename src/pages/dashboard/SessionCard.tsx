// ARCHITECT: карточка сессии. Данные берутся из общего источника (режимы — MOCK_LEARNING_MODES,
// персонаж и имя — getBlobatarById), чтобы подписи совпадали с чатом. Вся карточка — одна
// ссылка: попасть в остановленную тему можно в один тап.
// ARCHITECT: статус выводится из прогресса, а не хранится отдельным полем: расхождение
// «завершена, но пройдено 3 из 10» невозможно по конструкции.

import { Link } from "react-router-dom";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatusMarker } from "@/components/shared/StatusMarker";
import { formatRelativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import type { EnhancedChatSession } from "@/types/session";

interface SessionCardProps {
    session: EnhancedChatSession;
}

export function SessionCard({ session }: SessionCardProps) {
    const repetitor = getBlobatarById(session.repetitorId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === session.learningMode);

    const { completedLessons, totalLessons } = session.progress;
    const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;
    const percent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return (
        <Link
            to={`/app/chat/${session.id}`}
            className={cn(
                "flex flex-col gap-4 rounded-2xl bg-[#111113] p-4 transition-colors hover:bg-[#141416] md:p-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            )}
        >
            <div className="flex items-start gap-3">
                <BlobatarAvatar id={session.repetitorId} className="size-10 bg-[#1a1a1c]" />

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium text-[#f0f0f5] md:text-base">{session.title}</h2>
                    <p className="mt-0.5 truncate text-xs text-[#f0f0f5]/40">
                        {repetitor?.name ?? "Репетитор"} · {mode?.label ?? session.learningMode}
                    </p>
                </div>

                <StatusMarker
                    label={isCompleted ? "Завершена" : "В процессе"}
                    emphasis={isCompleted ? "faint" : "solid"}
                    className="shrink-0"
                />
            </div>

            <div className="flex items-center gap-3">
                <ProgressBar value={percent} className="flex-1" />
                <span className="shrink-0 text-xs tabular-nums text-[#f0f0f5]/40">
                    {completedLessons} из {totalLessons}
                </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-[#f0f0f5]/35">
                <span className="truncate tabular-nums">
                    {session.targetLevel ? `Уровень ${session.targetLevel}` : "Уровень не задан"}
                </span>
                <span className="shrink-0">{formatRelativeTime(session.lastActivityAt)}</span>
            </div>
        </Link>
    );
}
