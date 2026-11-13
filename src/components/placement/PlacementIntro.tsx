// ARCHITECT: интро теста уровня — отдельный блок шага: описание занимает половину файла, а
// оркестратор фаз должен оставаться читаемым.

import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";

interface PlacementIntroProps {
    /** Включена ли проверка аудирования после основных вопросов. */
    withListening: boolean;
    /** Есть незаконченная сессия теста: тогда кнопка продолжает её, а не начинает заново. */
    hasProgress: boolean;
    onToggleListening: (value: boolean) => void;
    onStart: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

const INTRO_POINTS = [
    "Двадцать вопросов: десять на грамматику и десять на общий английский.",
    "Около семи минут в спокойном темпе.",
    "Сложность подстраивается под ответы — тест адаптивный.",
];

export function PlacementIntro({
    withListening,
    hasProgress,
    onToggleListening,
    onStart,
    onBack,
    step,
    totalSteps,
}: PlacementIntroProps) {
    return (
        <div className="mx-auto w-full max-w-xl">
            <StepHeader
                eyebrow={ONBOARDING_STEP_TITLES.assessment}
                title="Определим твой уровень"
                subtitle="Адаптивный тест: сложность подстраивается под ответы. Уровень по CEFR, балл по шкале 0-100."
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
                            {point}
                        </li>
                    ))}
                </ul>

                {/* ARCHITECT: аудирование — opt-in в описании теста: по умолчанию выключено, потому
                    что его можно пройти когда угодно, а звук в тесте уровня не всем нужен. */}
                <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 border-t border-white/5 pt-4">
                    <input
                        type="checkbox"
                        checked={withListening}
                        onChange={(event) => onToggleListening(event.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-[#f0f0f5]"
                    />
                    <span className="min-w-0">
                        <span className="block text-sm text-[#f0f0f5]">
                            Добавить проверку аудирования
                        </span>
                        <span className="mt-1 block text-xs leading-[1.6] text-[#f0f0f5]/50">
                            Шесть коротких заданий на понимание на слух после основных вопросов. Можно
                            пройти и позже — карточка появится в «Обзоре».
                        </span>
                    </span>
                </label>
            </StepCard>

            <StepNav
                onBack={onBack}
                onNext={onStart}
                nextLabel={hasProgress ? "Продолжить тест" : "Начать тест"}
            />
        </div>
    );
}