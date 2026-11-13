// ARCHITECT: экран вопроса аудирования — карточка задания и навигация под ней. Вынесен из потока:
// сам тест остаётся счётчиком состояния и переходами между фазами, а разметка одного экрана живёт
// отдельно.
// ARCHITECT: «Выйти» есть только там, где проверка открыта отдельным экраном: из шага мастера ведут
// его собственные кнопки.

import type { PlacementItem } from "@/types/placement";
import { ListeningQuestion } from "@/components/placement/ListeningQuestion";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/lib/surfaces";

interface ListeningQuestionStepProps {
    item: PlacementItem;
    number: number;
    total: number;
    plays: number;
    maxPlays: number;
    selectedOptionId: string | null;
    /** Последнее задание: кнопка завершает проверку, а не листает дальше. */
    isLast: boolean;
    onSelect: (optionId: string) => void;
    onPlay: () => void;
    onNext: () => void;
    onExit?: () => void;
}

export function ListeningQuestionStep({
    item,
    number,
    total,
    plays,
    maxPlays,
    selectedOptionId,
    isLast,
    onSelect,
    onPlay,
    onNext,
    onExit,
}: ListeningQuestionStepProps) {
    return (
        <StepCard>
            <ListeningQuestion
                item={item}
                number={number}
                total={total}
                plays={plays}
                maxPlays={maxPlays}
                selectedOptionId={selectedOptionId}
                onSelect={onSelect}
                onPlay={onPlay}
            />

            <div className="mt-5 flex items-center justify-between gap-3">
                {onExit ? (
                    <Button type="button" variant="ghost" onClick={onExit} className={GHOST_BUTTON}>
                        Выйти
                    </Button>
                ) : (
                    <span />
                )}

                <Button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={onNext}
                    disabled={selectedOptionId === null}
                >
                    {isLast ? "Завершить" : "Дальше"}
                </Button>
            </div>
        </StepCard>
    );
}