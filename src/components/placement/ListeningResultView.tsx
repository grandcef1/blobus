// ARCHITECT: итог аудирования — уровень и число верных ответов. Оценка мок: реальная проверка
// понимания на слух и произношения нейросетью появится на бэкенде.

import { useTranslation } from "react-i18next";
import { LEVEL_DESCRIPTION_KEYS } from "@/lib/placement";
import type { EnglishLevel } from "@/types/onboarding";

interface ListeningResultViewProps {
    level: EnglishLevel;
    correctCount: number;
    total: number;
}

export function ListeningResultView({ level, correctCount, total }: ListeningResultViewProps) {
    const { t } = useTranslation("placement");

    return (
        <div className="mt-4">
            <p className="text-sm text-[#f0f0f5]/80">
                {t("listening.resultLevel", { level })}
            </p>
            <p className="mt-2 text-xs leading-[1.6] text-[#f0f0f5]/50">
                {t(LEVEL_DESCRIPTION_KEYS[level])}{" "}
                {t("listening.correctCount", { correct: correctCount, total })}
            </p>
        </div>
    );
}