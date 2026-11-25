// ARCHITECT: сводка реальной сессии: чат ещё не подключён (фаза C), поэтому карточка — не ссылка,
// а статья. Прогресс, уровень и последнее сообщение не показываем: этих данных в GET /api/sessions нет,
// а подставлять моки в реальный список нельзя.
// ARCHITECT: заголовок производный — имя блобатара плюс метка режима: своей темы у сессии в схеме нет.

import { useTranslation } from "react-i18next";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { formatRelativeTime } from "@/lib/relativeTime";
import type { SessionSummaryDto } from "@/api/sessions";
import type { LearningMode } from "@/types/onboarding";

interface SessionSummaryCardProps {
    readonly summary: SessionSummaryDto;
}

type ModeLabelKey = "modes.interview" | "modes.speaking" | "modes.grammar" | "modes.general";

// ARCHITECT: типизированный map ключей: известный режим переводим, неизвестный показываем как данные.
const MODE_LABEL_KEYS: Readonly<Record<LearningMode, ModeLabelKey>> = {
    interview: "modes.interview",
    speaking: "modes.speaking",
    grammar: "modes.grammar",
    general: "modes.general",
};

function isLearningMode(mode: string): mode is LearningMode {
    return Object.prototype.hasOwnProperty.call(MODE_LABEL_KEYS, mode);
}

export function SessionSummaryCard({ summary }: SessionSummaryCardProps) {
    const { t } = useTranslation("dashboard");
    const tutor = getBlobatarById(summary.tutorId);
    const modeLabel = isLearningMode(summary.mode)
        ? t(MODE_LABEL_KEYS[summary.mode])
        : summary.mode;
    // ARCHITECT: updatedAt основной как «последняя активность»; битую дату подменяем созданием, а не пустотой.
    const updatedAt = Date.parse(summary.updatedAt);
    const lastActivity = Number.isNaN(updatedAt) ? Date.parse(summary.createdAt) : updatedAt;

    return (
        <article className="flex items-center gap-3 rounded-2xl bg-[#111113] p-4 md:p-5">
            <BlobatarAvatar id={summary.tutorId} className="size-10 bg-[#1a1a1c]" />

            <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium text-[#f0f0f5] md:text-base">
                    {tutor?.name ?? t("sessions.card.tutorFallback")} · {modeLabel}
                </h2>
                <p className="mt-0.5 truncate text-xs tabular-nums text-[#f0f0f5]/35">
                    {formatRelativeTime(lastActivity)}
                </p>
            </div>
        </article>
    );
}
