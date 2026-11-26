// ARCHITECT: интро теста уровня — отдельный блок шага: описание занимает половину файла, а
// оркестратор фаз должен оставаться читаемым.
// ARCHITECT: опции аудирования здесь больше нет (C-0d3c): фиксированная форма 30 его не содержит, а сама
// проверка осталась отдельным экраном /listening.

import { useTranslation } from "react-i18next";
import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";

interface PlacementIntroProps {
    /** Есть незаконченная сессия теста: тогда кнопка продолжает её, а не начинает заново. */
    hasProgress: boolean;
    onStart: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

// ARCHITECT: карта хранит ключи placement-неймспейса, а не подписи: t() резолвит их в рендере, поэтому
// смена языка обновляет список без перемонтирования.
const INTRO_POINTS = [
    "intro.points.questions",
    "intro.points.duration",
    "intro.points.adaptive",
] as const;

export function PlacementIntro({
    hasProgress,
    onStart,
    onBack,
    step,
    totalSteps,
}: PlacementIntroProps) {
    const { t } = useTranslation("placement");
    const { t: tCommon } = useTranslation("common");

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.assessment)}
                title={t("intro.title")}
                subtitle={t("intro.subtitle")}
                step={step}
                totalSteps={totalSteps}
            />

            <StepCard>
                <ul className="flex flex-col gap-3 text-sm leading-[1.6] text-[#f0f0f5]/70">
                    {INTRO_POINTS.map((point) => (
                        <li key={point} className="flex gap-3">
                            <span
                                className="mt-2 size-1 shrink-0 rounded-full bg-[#f0f0f5]/40"
                                aria-hidden="true"
                            />
                            {t(point)}
                        </li>
                    ))}
                </ul>
            </StepCard>

            <StepNav
                onBack={onBack}
                onNext={onStart}
                nextLabel={hasProgress ? t("shell.resumeTest") : t("shell.startTest")}
            />
        </div>
    );
}
