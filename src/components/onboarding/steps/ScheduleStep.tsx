// ARCHITECT: Выбор расписания занятий. Логика не меняется: рескин — заголовок через
// StepHeader, плитки частоты и длительности на общих токенах поверхностей, навигация
// через StepNav. Сетка длительности на узких экранах 2x2 вместо 4x1: в четыре колонки
// подписи обрезались на 390px (замерено 3 узла с переполнением), с sm снова 4x1.

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
        <div className="mx-auto max-w-2xl">
            <StepHeader
                eyebrow="Расписание"
                title="Как часто будешь заниматься?"
                subtitle="Постоянство важнее интенсивности. Выбери темп, который впишется в твою жизнь."
                step={step}
                totalSteps={totalSteps}
            />

            {/* Выбор частоты */}
            <div className="mb-8">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                    <Calendar className="size-4" />
                    Частота занятий
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {FREQUENCY_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setFrequency(option.id)}
                            className={tileClasses(frequency === option.id, 'p-4 text-left')}
                        >
                            <p className="font-medium text-[#f0f0f5]">{option.label}</p>
                            <p className="text-xs text-[#f0f0f5]/40">{option.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Выбор длительности */}
            <div className="mb-10">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#f0f0f5]/70">
                    <Clock className="size-4" />
                    Длительность занятия
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {DURATION_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setDuration(option.id)}
                            className={tileClasses(duration === option.id, 'p-4 text-center')}
                        >
                            <p className="text-lg font-semibold text-[#f0f0f5]">
                                {option.label}
                            </p>
                            <p className="text-[10px] text-[#f0f0f5]/40">{option.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <StepNav onBack={onBack} onNext={handleNext} nextLabel="Начать обучение" />
        </div>
    );
}