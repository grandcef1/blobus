// ARCHITECT: сводка теста показывает ровно то, что вернул сервер: балл по шкале EF SET (0-100),
// уровень CEFR и одну строку о том, что он значит. Дорожек и строки аудирования здесь нет: форму из
// тридцати вопросов сервер оценивает одним уровнем, а аудирование — отдельная проверка (C-0d3d).
// Числа — tabular-nums, цветных бейджей нет: статус показывают текст и метка уровня, как везде.

import { useTranslation } from "react-i18next";
import type { PlacementResultDto } from "@/types/placement";
import { LEVEL_DESCRIPTION_KEYS } from "@/lib/placement";
import { StepCard } from "@/components/onboarding/StepCard";

interface PlacementResultViewProps {
    result: PlacementResultDto;
}

export function PlacementResultView({ result }: PlacementResultViewProps) {
    const { t } = useTranslation("placement");

    return (
        <StepCard className="flex flex-col gap-5">
            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums text-[#f0f0f5]">
                    {result.score}
                </span>
                <span className="text-sm text-[#f0f0f5]/50">
                    {t("result.score", { level: result.level })}
                </span>
            </div>

            <p className="text-sm leading-[1.6] text-[#f0f0f5]/70">
                {t(LEVEL_DESCRIPTION_KEYS[result.level])}
            </p>
        </StepCard>
    );
}
