// ARCHITECT: один вопрос теста. Верного ответа и разбора здесь нет: банк приходит с сервера без ключа, а тест
// измеряет уровень, а не тренирует, поэтому после ответа выбранный вариант отмечается нейтрально, а соседние
// гаснут — цвет «верно/неверно» раскрывал бы ключ, которого у клиента нет.
// ARCHITECT: разметка одна на все предметы теста, поэтому опции берутся из общего QuizOptionButton.

import { useTranslation } from "react-i18next";
import type { PlacementItem } from "@/types/placement";
import { QuizOptionButton } from "@/components/shared/QuizOptionButton";
import type { QuizOptionState } from "@/components/shared/QuizOptionButton";
import { StepCard } from "@/components/onboarding/StepCard";

interface PlacementQuestionProps {
    item: PlacementItem;
    number: number;
    total: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
}

const MARKERS = ["1", "2", "3", "4"];

export function PlacementQuestion({
    item,
    number,
    total,
    selectedOptionId,
    onSelect,
}: PlacementQuestionProps) {
    const { t } = useTranslation("placement");
    const isAnswered = selectedOptionId !== null;

    // ARCHITECT: выбранный вариант остаётся обычным (idle), остальные гаснут (dimmed): оба состояния нейтральны
    // и уже есть в QuizOptionButton, поэтому вид теста не зависит от того, что сервер не отдаёт ответы.
    const stateFor = (optionId: string): QuizOptionState => {
        if (!isAnswered) return "idle";
        return optionId === selectedOptionId ? "idle" : "dimmed";
    };

    return (
        <StepCard>
            {/* ARCHITECT: live-регион вокруг вопроса целиком: при переходе меняются и номер, и стем, и опции,
                поэтому скринридер должен получить обновление блока, а не одной строки. */}
            <div aria-live="polite">
                <p className="text-xs tabular-nums text-[#f0f0f5]/50">
                    {t("test.question", { number, total })}
                </p>

                <p className="mt-4 text-base leading-[1.6] text-[#f0f0f5] md:text-lg">
                    {item.prompt}
                </p>

                <div
                    className="mt-5 flex flex-col gap-2"
                    role="group"
                    aria-label={t("test.optionsLabel")}
                >
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
        </StepCard>
    );
}
