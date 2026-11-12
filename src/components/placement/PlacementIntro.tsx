// ARCHITECT: интро теста уровня — отдельный блок шага: описание занимает половину файла, а
// оркестратор фаз должен оставаться читаемым.

import { StepCard } from "@/components/onboarding/StepCard";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepNav } from "@/components/onboarding/StepNav";
import { ONBOARDING_STEP_TITLES } from "@/types/onboarding";

interface PlacementIntroProps {
    onStart: () => void;
    onBack: () => void;
    step: number;
    totalSteps: number;
}

const INTRO_POINTS = [
    "Двенадцать вопросов: шесть на грамматику и шесть на общий английский.",
    "Сложность подстраивается под ответы — тест адаптивный.",
    "Аудирование в тест не входит: его можно пройти отдельно в любой момент.",
];

export function PlacementIntro({ onStart, onBack, step, totalSteps }: PlacementIntroProps) {
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
            </StepCard>

            <StepNav onBack={onBack} onNext={onStart} nextLabel="Начать тест" />
        </div>
    );
}