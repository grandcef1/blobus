// ARCHITECT: Выбор расписания занятий. Логика не меняется: заголовок через StepHeader,
// плитки частоты и длительности на общих токенах поверхностей, навигация через StepNav.
// Форма живёт в max-w-xl, ритм задан gap-8 между смысловыми блоками и gap-4 внутри сеток;
// длительность на узких экранах 2x2 вместо 4x1, с sm снова 4x1.

import { useState } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { StepNav } from '@/components/onboarding/StepNav';
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

const FREQUENCY_OPTIONS = [
    { id: 'daily', label: 'Каждый день', description: 'Выработай привычку' },
    { id: 'every-other-day', label: 'Через день', description: 'Сбалансированный темп' },
    { id: '3-times-week', label: '3 раза в неделю', description: 'Стабильный прогресс' },
    { id: 'weekly', label: 'Раз в неделю', description: 'Лёгкая практика' },
] as const;

const DURATION_OPTIONS = [
    { id: 15, label: '15 мин', description: 'Быстрые занятия' },
    { id: 30, label: '30 мин', description: 'Рекомендуем' },
    { id: 45, label: '45 мин', description: 'Глубокое погружение' },
    { id: 60, label: '60 мин', description: 'Интенсив' },
] as const;

export function ScheduleStep({ schedule, onUpdate, onNext, onBack, step, totalSteps }: ScheduleStepProps) {
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
                eyebrow="Расписание"
                title="Как часто будешь заниматься?"
                subtitle="Регулярность важнее интенсивности: выбери темп, который удобно держать."
                step={step}
                totalSteps={totalSteps}
            />

            {/* ARCHITECT: два смысловых блока разделены gap-8, внутри блока заголовок и сетка
                плиток — gap-4: так шаг читается как форма, а не как сплошной список. */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                        <Calendar className="size-4" aria-hidden="true" />
                        Частота занятий
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {FREQUENCY_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setFrequency(option.id)}
                                className={tileClasses(frequency === option.id, 'p-5 text-left')}
                            >
                                <span className="block font-medium text-[#f0f0f5]">{option.label}</span>
                                <span className="block text-xs text-[#f0f0f5]/50">
                                    {option.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                        <Clock className="size-4" aria-hidden="true" />
                        Длительность занятия
                    </h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {DURATION_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setDuration(option.id)}
                                className={tileClasses(duration === option.id, 'p-5 text-center')}
                            >
                                <span className="block text-lg font-semibold text-[#f0f0f5]">
                                    {option.label}
                                </span>
                                <span className="block text-xs leading-snug text-[#f0f0f5]/50">
                                    {option.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <StepNav onBack={onBack} onNext={handleNext} nextLabel="Начать обучение" />
        </div>
    );
}
