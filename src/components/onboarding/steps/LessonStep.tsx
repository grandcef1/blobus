// ARCHITECT: шаг 5 «Урок» — сводка перед стартом: репетитор, цель, уровень из теста и расписание.
// Кнопка здесь одна: следующее осмысленное действие — первый урок, лишние развилки не нужны.
// ARCHITECT: создание сессии и переход в чат остаются в Onboarding: состояние мастера живёт в одном
// месте, и шаг не знает про маршруты.

import { useTranslation } from "react-i18next";
import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import type { OnboardingData, SchedulePreference } from "@/types/onboarding";
import { ONBOARDING_STEP_TITLE_KEYS } from "@/types/onboarding";

interface LessonStepProps {
    data: OnboardingData;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

const FREQUENCY_LABEL_KEYS = {
    daily: "lesson.frequency.daily",
    "every-other-day": "lesson.frequency.everyOtherDay",
    "3-times-week": "lesson.frequency.threeTimesWeek",
    weekly: "lesson.frequency.weekly",
} as const satisfies Record<SchedulePreference["frequency"], string>;

export function LessonStep({ data, onNext, onBack, step, totalSteps }: LessonStepProps) {
    const { t } = useTranslation("onboarding");
    const { t: tCommon } = useTranslation("common");
    const repetitor = data.blobatarId === null ? undefined : getBlobatarById(data.blobatarId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === data.learningMode);

    const describeSchedule = (schedule: SchedulePreference | null): string =>
        schedule === null
            ? t("lesson.scheduleNotSelected")
            : t("lesson.scheduleValue", {
                  frequency: t(FREQUENCY_LABEL_KEYS[schedule.frequency]),
                  minutes: schedule.durationMinutes,
              });

    const rows = [
        { id: "mode", label: t("lesson.goalLabel"), value: mode?.label ?? t("lesson.goalNotSelected") },
        { id: "level", label: t("lesson.levelLabel"), value: data.englishLevel ?? t("lesson.levelUnknown") },
        { id: "schedule", label: t("lesson.scheduleLabel"), value: describeSchedule(data.schedule) },
    ];

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.lesson)}
                title={t("lesson.title")}
                subtitle={t("lesson.subtitle")}
                step={step}
                totalSteps={totalSteps}
            />

            <StepCard className="flex flex-col gap-4">
                {repetitor && (
                    <div className="flex items-center gap-3">
                        <BlobatarAvatar id={repetitor.id} className="size-11" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-[#f0f0f5]">{repetitor.name}</p>
                            <p className="text-xs leading-[1.6] text-[#f0f0f5]/50">
                                {repetitor.persona.teachingStyle}
                            </p>
                        </div>
                    </div>
                )}

                <dl className="flex flex-col gap-3 border-t border-white/5 pt-4 text-sm">
                    {rows.map((row) => (
                        <div key={row.id} className="flex items-baseline justify-between gap-4">
                            <dt className="text-[#f0f0f5]/50">{row.label}</dt>
                            <dd className="text-right text-[#f0f0f5]">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            </StepCard>

            <StepNav onBack={onBack} onNext={onNext} nextLabel={t("lesson.start")} />
        </div>
    );
}