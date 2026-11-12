// ARCHITECT: шаг 5 «Урок» — сводка перед стартом: репетитор, цель, уровень из теста и расписание.
// Кнопка здесь одна: следующее осмысленное действие — первый урок, лишние развилки не нужны.
// ARCHITECT: создание сессии и переход в чат остаются в Onboarding: состояние мастера живёт в одном
// месте, и шаг не знает про маршруты.

import { BlobatarAvatar } from "@/components/shared/BlobatarAvatar";
import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { getBlobatarById } from "@/api/mocks/blobatars";
import { MOCK_LEARNING_MODES } from "@/api/mocks/repetitors";
import type { OnboardingData, SchedulePreference } from "@/types/onboarding";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";

interface LessonStepProps {
    data: OnboardingData;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

const FREQUENCY_LABELS: Record<SchedulePreference["frequency"], string> = {
    daily: "каждый день",
    "every-other-day": "через день",
    "3-times-week": "3 раза в неделю",
    weekly: "раз в неделю",
};

function describeSchedule(schedule: SchedulePreference | null): string {
    if (schedule === null) return "не выбрано";

    return `${FREQUENCY_LABELS[schedule.frequency]} · ${schedule.durationMinutes} мин`;
}

export function LessonStep({ data, onNext, onBack, step, totalSteps }: LessonStepProps) {
    const repetitor = data.blobatarId === null ? undefined : getBlobatarById(data.blobatarId);
    const mode = MOCK_LEARNING_MODES.find((item) => item.id === data.learningMode);

    const rows = [
        { id: "mode", label: "Цель", value: mode?.label ?? "не выбрана" },
        { id: "level", label: "Уровень из теста", value: data.englishLevel ?? "не определён" },
        { id: "schedule", label: "Расписание", value: describeSchedule(data.schedule) },
    ];

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.lesson}
                title="Всё готово к первому уроку"
                subtitle="Сессия откроется сразу: репетитор начнёт с темы выбранной цели."
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

            <StepNav onBack={onBack} onNext={onNext} nextLabel="Начать урок" />
        </div>
    );
}