// ARCHITECT: одно задание аудирования — прогресс, повтор озвучки, вопрос и опции. Вынесено из
// диалога: диалог владеет фазой и озвучкой, а разметка задания живёт отдельно.

import { Volume2 } from "lucide-react";
import type { PlacementItem } from "@/types/placement";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";

interface ListeningQuestionProps {
    item: PlacementItem;
    number: number;
    total: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
    onReplay: () => void;
}

const MARKERS = ["1", "2", "3", "4"];
const REPLAY_BUTTON =
    "flex min-h-11 items-center gap-2 rounded-full px-3 text-xs text-[#f0f0f5]/60 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";

export function ListeningQuestion({
    item,
    number,
    total,
    selectedOptionId,
    onSelect,
    onReplay,
}: ListeningQuestionProps) {
    const isAnswered = selectedOptionId !== null;

    const stateFor = (optionId: string): QuizOptionState => {
        if (!isAnswered) return "idle";
        if (optionId === item.correctOptionId) return "correct";
        return optionId === selectedOptionId ? "wrong" : "dimmed";
    };

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs tabular-nums text-[#f0f0f5]/50">
                    Задание {number} из {total}
                </p>
                <button type="button" onClick={onReplay} className={REPLAY_BUTTON}>
                    <Volume2 className="size-3.5" aria-hidden="true" />
                    Прослушать снова
                </button>
            </div>

            <p className="mt-4 text-sm leading-[1.6] text-[#f0f0f5]">{item.prompt}</p>

            <div className="mt-4 flex flex-col gap-2" role="group" aria-label="Варианты ответа">
                {item.options.map((option, index) => (
                    <QuizOptionButton
                        key={option.id}
                        marker={MARKERS[index] ?? ""}
                        text={option.text}
                        state={stateFor(option.id)}
                        disabled={isAnswered}
                        onSelect={() => onSelect(option.id)}
                    />
                ))}
            </div>
        </div>
    );
}