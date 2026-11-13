// ARCHITECT: сводка теста: балл по шкале EF SET (0-100), итоговый уровень и разбивка по дорожкам.
// Числа — tabular-nums, цветных бейджей нет: статус показывают текст и метка уровня, как везде.
// ARCHITECT: аудирование в основной тест не входит, поэтому строка о нём ведёт на отдельный экран —
// и с экрана результата, и из профиля. Кнопка есть только пока проверки не было: пройденный уровень
// показывается значением строки, и предлагать его заново нечего.

import type { PlacementResult } from "@/types/placement";
import { LEVEL_DESCRIPTIONS } from "@/lib/placement";
import { StepCard } from "@/components/onboarding/StepCard";

interface PlacementResultViewProps {
    result: PlacementResult;
    onCheckListening: () => void;
}

const LINK_BUTTON =
    "mt-2 min-h-11 text-sm text-[#f0f0f5] underline transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function PlacementResultView({ result, onCheckListening }: PlacementResultViewProps) {
    const tracks = [
        { id: "grammar", label: "Грамматика", level: result.grammar },
        { id: "general", label: "Общий английский", level: result.general },
    ];

    return (
        <StepCard className="flex flex-col gap-5">
            <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums text-[#f0f0f5]">
                    {result.score}
                </span>
                <span className="text-sm text-[#f0f0f5]/50">
                    из 100 · уровень {result.overall}
                </span>
            </div>

            <p className="text-sm leading-[1.6] text-[#f0f0f5]/70">
                {LEVEL_DESCRIPTIONS[result.overall]}
            </p>

            <dl className="flex flex-col gap-4 border-t border-white/5 pt-4">
                {tracks.map((track) => (
                    <div key={track.id}>
                        <dt className="flex items-center justify-between gap-3 text-sm text-[#f0f0f5]/80">
                            {track.label}
                            <span className="tabular-nums text-[#f0f0f5]">{track.level}</span>
                        </dt>
                        <dd className="mt-1 text-xs leading-[1.6] text-[#f0f0f5]/50">
                            {LEVEL_DESCRIPTIONS[track.level]}
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="border-t border-white/5 pt-4">
                <p className="flex items-center justify-between gap-3 text-sm text-[#f0f0f5]/80">
                    Аудирование
                    <span className="tabular-nums text-[#f0f0f5]">
                        {result.listening ?? "не проверено"}
                    </span>
                </p>
                <p className="mt-1 text-xs leading-[1.6] text-[#f0f0f5]/50">
                    {result.listening
                        ? LEVEL_DESCRIPTIONS[result.listening]
                        : "Аудирование не проверено: пройти можно здесь или в разделе «Обзор» — карточка ждёт на стартовой странице."}
                </p>

                {result.listening === null && (
                    <button type="button" onClick={onCheckListening} className={LINK_BUTTON}>
                        Проверить аудирование
                    </button>
                )}
            </div>
        </StepCard>
    );
}