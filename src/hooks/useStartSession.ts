// ARCHITECT: старт сессии вынесен из мастера: финал полного флоу и режима session делают одно и то же,
// а ветка мок/реал различается навигацией и целевым уровнем, поэтому она живёт в отдельном хуке и тесте.
// ARCHITECT: real-ветка ведёт на список — чат реальных сессий подключится в фазе C. Инвалидация
// ["sessions"] обновляет список и сайдбар: ключ общий. targetLevel есть только в мок-ветке — колонки
// в реальной схеме нет.

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
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
    const { t } = useTranslation("dashboard");
    const inFlight = useRef(false);

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

        // ARCHITECT: гард против двойного клика и повторного вызова до навигации (§16.7); визуальный
        // disabled кнопки — отдельный долг (прокинуть isStarting в шаги мастера).
        if (inFlight.current) return;

        inFlight.current = true;

        try {
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
            } catch (error) {
                // ARCHITECT: один тост на 401: терминальный тост и редирект делает общий useAuthExpiry
                // внутри useSessions, когда список откроется.
                if (!(error instanceof ApiError && error.statusCode === 401)) {
                    toast.error(t("sessions.create.error"));
                }

                navigate("/app/sessions", { replace: true });
            }
        } finally {
            inFlight.current = false;
        }
    };

    return { startSession };
}
