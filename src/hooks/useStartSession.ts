// ARCHITECT: старт сессии вынесен из мастера: финал полного флоу и режима session делают одно и то же,
// а ветка мок/реал различается навигацией и целевым уровнем, поэтому она живёт в отдельном хуке и тесте.
// ARCHITECT: real-ветка перед созданием сессии проверяет результат теста уровня: без него сервер откажет в чате,
// а уровень сессии взять негде (server/routes/chat.ts). Нет результата — сессия не создаётся, пользователь
// возвращается к прохождению теста. Инвалидация ["sessions"] обновляет список, сайдбар и кэш чата: ключ общий.
// targetLevel есть только в мок-ветке — колонки в реальной схеме нет.

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { fetchPlacementResultDto, getResult } from "@/api/placement";
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
                // ARCHITECT: гейт старта: результат теста уровня приходит с сервера, а не из памяти страницы —
                // «на глаз» уровень не выставляется, и без него сессия не создаётся (§16.2).
                const placement = await fetchPlacementResultDto();

                if (placement === null) {
                    toast.error(t("sessions.create.noPlacement"));
                    navigate("/onboarding", { replace: true });
                    return;
                }

                const created = await createSessionSummary({
                    tutorId: blobatarId,
                    mode: learningMode,
                });
                await queryClient.invalidateQueries({ queryKey: ["sessions"] });
                // ARCHITECT: чат реальных сессий открывается сразу: сессия уже создана, и список — лишний шаг.
                navigate(`/app/chat/${created.id}`, { replace: true });
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
