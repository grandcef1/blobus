// ARCHITECT: одно задание аудирования — прогресс, счётчик прослушиваний, запуск озвучки, вопрос и
// опции. Вынесено из потока: разметка задания не знает, откуда оно открыто — из мастера или из
// «Обзора».

import { Volume2 } from "lucide-react";
import type { PlacementItem } from "@/types/placement";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { cn } from "@/lib/utils";

interface ListeningQuestionProps {
    item: PlacementItem;
    number: number;
    total: number;
    /** Сколько раз задание уже прослушано. */
    plays: number;
    maxPlays: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
    onPlay: () => void;
}

const MARKERS = ["1", "2", "3", "4"];
const PLAY_BUTTON =
    "flex min-h-11 items-center gap-2 rounded-full px-3 text-xs text-[#f0f0f5]/60 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]";
const PLAY_BUTTON_LOCKED = "text-[#f0f0f5]/25 hover:bg-transparent hover:text-[#f0f0f5]/25";

export function ListeningQuestion({
    item,
    number,
    total,
    plays,
    maxPlays,
    selectedOptionId,
    onSelect,
    onPlay,
}: ListeningQuestionProps) {
    const isAnswered = selectedOptionId !== null;
    const canPlay = plays < maxPlays;
    // ARCHITECT: ответ доступен только после первого прослушивания: задание на понимание на слух
    // нельзя решать наугад, не услышав запись.
    const canAnswer = plays > 0;

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

                <div className="flex items-center gap-2">
                    {/* ARCHITECT: счётчик виден до второго запуска: он объясняет, почему кнопка
                        погаснет, и проверяет беглое понимание, а не вслушивание. */}
                    <span className="text-xs tabular-nums text-[#f0f0f5]/40">
                        {canPlay
                            ? `Прослушивание ${plays + 1} из ${maxPlays}`
                            : "Лимит прослушиваний"}
                    </span>
                    <button
                        type="button"
                        onClick={onPlay}
                        disabled={!canPlay}
                        className={cn(PLAY_BUTTON, !canPlay && PLAY_BUTTON_LOCKED)}
                    >
                        <Volume2 className="size-3.5" aria-hidden="true" />
                        Прослушать
                    </button>
                </div>
            </div>

            <p className="mt-4 text-sm leading-[1.6] text-[#f0f0f5]">{item.prompt}</p>

            {!canAnswer && (
                <p className="mt-3 text-xs text-[#f0f0f5]/40">
                    Опции откроются после первого прослушивания.
                </p>
            )}

            <div className="mt-4 flex flex-col gap-2" role="group" aria-label="Варианты ответа">
                {item.options.map((option, index) => (
                    <QuizOptionButton
                        key={option.id}
                        marker={MARKERS[index] ?? ""}
                        text={option.text}
                        state={stateFor(option.id)}
                        disabled={isAnswered || !canAnswer}
                        onSelect={() => onSelect(option.id)}
                    />
                ))}
            </div>
        </div>
    );
}