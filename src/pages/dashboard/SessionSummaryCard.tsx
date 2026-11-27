// ARCHITECT: сводка реальной сессии — ссылка на /app/chat/:id: чат подключён, поэтому карточка открывает
// тему в один тап, а не остаётся статьёй. Прогресс, уровень и последнее сообщение не показываем: этих данных
// в GET /api/sessions нет, а подставлять моки в реальный список нельзя.
// ARCHITECT: заголовок общий с сайдбаром — getSessionTitle: своё название сессии, иначе «репетитор · режим».
// ARCHITECT: меню строки стоит рядом со ссылкой, а не внутри неё: необратимые действия не должны открывать чат,
// и по той же причине строка перестала быть одной большой ссылкой.
// ARCHITECT: тон ховера и фокус-кольцо совпадают с мок-карточкой SessionCard: строка списка выглядит одинаково.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionRowMenu } from "@/components/chat/header/SessionRowMenu";
import type { SessionActions } from "@/components/chat/header/sessionActions";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { formatRelativeTime } from "@/lib/relativeTime";
import { getSessionTitle } from "@/lib/sessionTitle";
import { cn } from "@/lib/utils";
import type { SessionSummaryDto } from "@/api/sessions";

interface SessionSummaryCardProps {
    readonly summary: SessionSummaryDto;
    /** Действия строки: не переданы — карточка только открывает чат. */
    readonly actions?: SessionActions;
}

export function SessionSummaryCard({ summary, actions }: SessionSummaryCardProps) {
    const { t } = useTranslation("dashboard");
    // ARCHITECT: updatedAt основной как «последняя активность»; битую дату подменяем созданием, а не пустотой.
    const updatedAt = Date.parse(summary.updatedAt);
    const lastActivity = Number.isNaN(updatedAt) ? Date.parse(summary.createdAt) : updatedAt;

    return (
        <article className="flex items-center gap-3 rounded-2xl bg-[#111113] p-4 transition-colors hover:bg-[#141416] md:p-5">
            <Link
                to={`/app/chat/${summary.id}`}
                className={cn(
                    "flex min-w-0 flex-1 items-center gap-3",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                )}
            >
                <BlobatarAvatar id={summary.tutorId} className="size-10 bg-[#1a1a1c]" />

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium text-[#f0f0f5] md:text-base">
                        {getSessionTitle(summary, t)}
                    </h2>
                    <p className="mt-0.5 truncate text-xs tabular-nums text-[#f0f0f5]/35">
                        {formatRelativeTime(lastActivity)}
                    </p>
                </div>
            </Link>

            {actions !== undefined && (
                <SessionRowMenu
                    title={summary.title ?? null}
                    tutorId={summary.tutorId}
                    actions={actions}
                />
            )}
        </article>
    );
}
