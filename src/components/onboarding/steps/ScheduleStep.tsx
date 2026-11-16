// ARCHITECT: Выбор расписания занятий. Логика не меняется: заголовок через StepHeader,
// плитки частоты и длительности на общих токенах поверхностей, навигация через StepNav.
// Форма живёт в max-w-xl, ритм задан gap-8 между смысловыми блоками и gap-4 внутри сеток;
// длительность на узких экранах 2x2 вместо 4x1, с sm снова 4x1.

import { useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { StepNav } from '@/components/onboarding/StepNav';
import { ONBOARDING_STEP_TITLE_KEYS } from '@/types/onboarding';
import type { SchedulePreference } from '@/types/onboarding';
import { tileClasses } from '@/lib/surfaces';

interface ScheduleStepProps {
    schedule: SchedulePreference | null;
    onUpdate: (schedule: SchedulePreference) => void;
    onNext: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

// ARCHITECT: карта хранит ключи, а не подписи: t() резолвит их в рендере, поэтому смена языка обновляет плитки.
const FREQUENCY_KEYS = [
    { id: 'daily', labelKey: 'schedule.frequency.daily.label', descriptionKey: 'schedule.frequency.daily.description' },
    { id: 'every-other-day', labelKey: 'schedule.frequency.everyOtherDay.label', descriptionKey: 'schedule.frequency.everyOtherDay.description' },
    { id: '3-times-week', labelKey: 'schedule.frequency.threeTimesWeek.label', descriptionKey: 'schedule.frequency.threeTimesWeek.description' },
    { id: 'weekly', labelKey: 'schedule.frequency.weekly.label', descriptionKey: 'schedule.frequency.weekly.description' },
] as const;

const DURATION_KEYS = [
    { id: 15, labelKey: 'schedule.duration.min15.label', descriptionKey: 'schedule.duration.min15.description' },
    { id: 30, labelKey: 'schedule.duration.min30.label', descriptionKey: 'schedule.duration.min30.description' },
    { id: 45, labelKey: 'schedule.duration.min45.label', descriptionKey: 'schedule.duration.min45.description' },
    { id: 60, labelKey: 'schedule.duration.min60.label', descriptionKey: 'schedule.duration.min60.description' },
] as const;

export function ScheduleStep({ schedule, onUpdate, onNext, onBack, step, totalSteps }: ScheduleStepProps) {
    const { t } = useTranslation('onboarding');
    const { t: tCommon } = useTranslation('common');
    const [frequency, setFrequency] = useState<SchedulePreference['frequency']>(
        schedule?.frequency ?? 'daily'
    );
    const [duration, setDuration] = useState<SchedulePreference['durationMinutes']>(
        schedule?.durationMinutes ?? 30
    );

    const handleNext = () => {
        onUpdate({
            frequency,
            durationMinutes: duration,
            preferredTimeSlots: [],
        });
        onNext();
    };

    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={tCommon(ONBOARDING_STEP_TITLE_KEYS.schedule)}
                title={t('schedule.title')}
                subtitle={t('schedule.subtitle')}
                step={step}
                totalSteps={totalSteps}
            />

            {/* ARCHITECT: два смысловых блока разделены gap-8, внутри блока заголовок и сетка
                плиток — gap-4: так шаг читается как форма, а не как сплошной список. */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                        <Calendar className="size-4" aria-hidden="true" />
                        {t('schedule.frequencyTitle')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {FREQUENCY_KEYS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setFrequency(option.id)}
                                className={tileClasses(frequency === option.id, 'p-5 text-left')}
                            >
                                <span className="block font-medium text-[#f0f0f5]">{t(option.labelKey)}</span>
                                <span className="block text-xs text-[#f0f0f5]/50">
                                    {t(option.descriptionKey)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                        <Clock className="size-4" aria-hidden="true" />
                        {t('schedule.durationTitle')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {DURATION_KEYS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setDuration(option.id)}
                                className={tileClasses(duration === option.id, 'p-5 text-center')}
                            >
                                <span className="block text-lg font-semibold text-[#f0f0f5]">
                                    {t(option.labelKey)}
                                </span>
                                <span className="block text-xs leading-snug text-[#f0f0f5]/50">
                                    {t(option.descriptionKey)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <StepNav onBack={onBack} onNext={handleNext} nextLabel={t('schedule.start')} />
        </div>
    );
}
