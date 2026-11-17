// ARCHITECT: сводка только про аудирование: у отложенной проверки нет ни грамматики, ни общего
// английского, поэтому показывать их было бы нечем — это дополнение к тесту уровня, а не его итог.
// ARCHITECT: вид повторяет сводку мастера, но усечён: тот же стеклянный блок, тот же порядок —
// уровень, объяснение, действие. Маршрут знает страница, поэтому компонент только сообщает о выходе.

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { LEVEL_DESCRIPTION_KEYS } from "@/lib/placement";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import type { EnglishLevel } from "@/types/onboarding";

interface ListeningResultSummaryProps {
    level: EnglishLevel;
    correctCount: number;
    total: number;
    onDone: () => void;
}

export function ListeningResultSummary({
    level,
    correctCount,
    total,
    onDone,
}: ListeningResultSummaryProps) {
    const { t } = useTranslation("placement");

    return (
        <StepCard className="flex flex-col gap-5">
            <h1 className="text-xl font-semibold text-[#f0f0f5]">{t("listening.checked")}</h1>

            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums text-[#f0f0f5]">{level}</span>
                <span className="text-sm text-[#f0f0f5]/50">{t("listening.levelValue")}</span>
            </div>

            <p className="text-sm leading-[1.6] text-[#f0f0f5]/70">{t(LEVEL_DESCRIPTION_KEYS[level])}</p>

            <p className="border-t border-white/5 pt-4 text-xs leading-[1.6] text-[#f0f0f5]/50">
                {t("listening.correctCount", { correct: correctCount, total })}{" "}
                {t("listening.saved")}
            </p>

            <div className="flex justify-end">
                <Button type="button" className={PRIMARY_BUTTON} onClick={onDone}>
                    {t("shell.backToOverview")}
                </Button>
            </div>
        </StepCard>
    );
}