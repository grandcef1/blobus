// ARCHITECT: Выбор расписания занятий — переведён на русский
// Все варианты частоты и длительности локализованы

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SchedulePreference } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface ScheduleStepProps {
    schedule: SchedulePreference | null;
    onUpdate: (schedule: SchedulePreference) => void;
    onNext: () => void;
    onBack: () => void;
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

export function ScheduleStep({ schedule, onUpdate, onNext, onBack }: ScheduleStepProps) {
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
            <div className="mb-10 text-center">
                <h2 className="mb-3 text-3xl font-bold text-[#f0f0f5]">
                    Как часто будешь заниматься?
                </h2>
                <p className="text-[#f0f0f5]/50">
                    Постоянство важнее интенсивности. Выбери темп, который впишется в твою жизнь.
                </p>
            </div>

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
                            className={cn(
                                'rounded-xl border p-4 text-left transition-all',
                                frequency === option.id
                                    ? 'border-white/40 bg-white/[0.08]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}
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
                <div className="grid grid-cols-4 gap-3">
                    {DURATION_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setDuration(option.id)}
                            className={cn(
                                'rounded-xl border p-4 text-center transition-all',
                                duration === option.id
                                    ? 'border-white/40 bg-white/[0.08]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            )}
                        >
                            <p className="text-lg font-semibold text-[#f0f0f5]">
                                {option.label}
                            </p>
                            <p className="text-[10px] text-[#f0f0f5]/40">{option.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button
                    onClick={onBack}
                    variant="ghost"
                    className="flex items-center gap-2 text-[#f0f0f5]/50 hover:text-[#f0f0f5]"
                >
                    <ArrowLeft className="size-4" />
                    Назад
                </Button>

                <Button
                    onClick={handleNext}
                    className="flex items-center gap-2 rounded-full bg-[#f0f0f5] px-8 py-3 text-black transition-transform hover:scale-[1.02]"
                >
                    Начать обучение
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}