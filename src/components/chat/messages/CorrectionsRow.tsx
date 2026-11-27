// ARCHITECT: карточка исправления по спецификации: сверху «как было» (красным только неверный фрагмент), ниже
// «как верно» (зелёным только исправленный фрагмент), правило отдельной подложкой, разделитель и примеры ниже.
// Каждый раздел стоит своей подложкой светлее базовой поверхности с вертикальным отступом между разделами
// (§спец. 3). Разбор строк живёт в correctionText.ts, разметка одной правки — в CorrectionItem.tsx: файл
// экспортирует только компонент (react-refresh/only-export-components).

import { useTranslation } from "react-i18next";
import type { ChatCorrection } from "@/api/chat";
import type { EnglishLevel } from "@/types/onboarding";
import { TRANSLATED_LEVELS } from "./correctionText";
import { CorrectionItem } from "./CorrectionItem";

interface CorrectionsRowProps {
    readonly corrections: readonly ChatCorrection[];
    /** Реплика ученика: из неё собирается пара «как было — как верно»; null — источника нет. */
    readonly source: string | null;
    /** Уровень ученика: на A1-A2 под примерами показывается перевод. */
    readonly level: EnglishLevel | null;
}

const EYEBROW = "text-[11px] uppercase tracking-wider text-amber-300/70";

export function CorrectionsRow({ corrections, source, level }: CorrectionsRowProps) {
    const { t } = useTranslation("common");

    if (corrections.length === 0) return null;

    const showTranslation = level !== null && TRANSLATED_LEVELS.includes(level);

    return (
        <div className="w-full rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 md:max-w-[min(85%,70ch)]">
            <p className={EYEBROW}>{t("correction.title")}</p>

            <ul className="mt-3 flex flex-col gap-4">
                {corrections.map((correction, index) => (
                    <CorrectionItem
                        key={index}
                        correction={correction}
                        source={source}
                        showTranslation={showTranslation}
                    />
                ))}
            </ul>
        </div>
    );
}

