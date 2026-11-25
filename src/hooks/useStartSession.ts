// ARCHITECT: старт сессии вынесен из мастера: финал полного флоу и режима session делают одно и то же,
// а ветка мок/реал различается навигацией и целевым уровнем, поэтому она живёт в отдельном хуке и тесте.
// ARCHITECT: real-ветка ведёт на список — чат реальных сессий подключится в фазе C. Инвалидация
// ["sessions"] обновляет список и сайдбар: ключ общий. targetLevel есть только в мок-ветке — колонки
// в реальной схеме нет.

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { getResult } from "@/api/placement";
import { createSession, createSessionSummary } from "@/api/sessions";
import { USE_MOCKS } from "@/lib/env";
import { levelForMode } from "@/lib/placement";
import { toast } from "@/store/toast";
import type { BlobatarId } from "@/types/blobatar";
import type { LearningMode } from "@/types/onboarding";

export interface StartSessionApi {
    readonly startSession: (
        blobatarId: BlobatarId | null,
        learningMode: LearningMode | null
    ) => Promise<void>;
}

export function useStartSession(): StartSessionApi {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t } = useTranslation("common");

    // ARCHITECT: без репетитора и режима создавать нечего: ветка защищает режим session и уводит в список,
    // а не на /app без сессии.
    const startSession = async (
        blobatarId: BlobatarId | null,
        learningMode: LearningMode | null
    ): Promise<void> => {
        if (!blobatarId || !learningMode) {
            navigate("/app/sessions", { replace: true });
            return;
        }

        if (USE_MOCKS) {
            // ARCHITECT: уровень сессии берётся из результата теста по дорожке режима — поведение мока
            // сохраняется целиком.
            const session = createSession({
                repetitorId: blobatarId,
                learningMode,
                targetLevel: levelForMode(learningMode, getResult()),
            });

            navigate(`/app/chat/${session.id}`, { replace: true });
            return;
        }

        try {
            await createSessionSummary({ tutorId: blobatarId, mode: learningMode });
            await queryClient.invalidateQueries({ queryKey: ["sessions"] });
            navigate("/app/sessions", { replace: true });
        } catch {
            // ARCHITECT: 401 здесь не разбираем: терминальный тост и редирект делает общий useAuthExpiry
            // внутри useSessions, когда список откроется.
            toast.error(t("states.error.title"));
            navigate("/app/sessions", { replace: true });
        }
    };

    return { startSession };
}
