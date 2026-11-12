// ARCHITECT: опция викторины — одна разметка для чата и теста уровня. Цвет меняется только по
// состоянию ответа (верно/неверно), заливок нет; маркер «А/Б/В/Г» или номер остаётся тонким.
// ARCHITECT: базовый фон опции — цвет обычного сообщения (#141416): опция не наследует тонировку
// карточки, поэтому читается как элемент управления, а не как часть фона.
// ARCHITECT: state приходит снаружи, поэтому компонент не знает, показывать ли разбор — этим
// управляет вызывающая сторона.

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizOptionState = "idle" | "correct" | "wrong" | "dimmed";

interface QuizOptionButtonProps {
    marker: string;
    text: string;
    state: QuizOptionState;
    disabled?: boolean;
    onSelect: () => void;
}

const STATE_STYLES: Record<QuizOptionState, string> = {
    idle: "border-white/5 hover:border-white/15",
    correct: "border-green-400/40",
    wrong: "border-red-400/40",
    dimmed: "border-white/5 opacity-50",
};

export function QuizOptionButton({
    marker,
    text,
    state,
    disabled = false,
    onSelect,
}: QuizOptionButtonProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl border bg-[#141416] px-4 py-3 text-left text-sm text-[#f0f0f5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]",
                STATE_STYLES[state]
            )}
        >
            <span className="w-4 shrink-0 text-xs text-[#f0f0f5]/40" aria-hidden="true">
                {marker}
            </span>
            <span className="flex-1">{text}</span>
            {state === "correct" && (
                <Check className="size-4 shrink-0 text-green-400" aria-hidden="true" />
            )}
            {state === "wrong" && <X className="size-4 shrink-0 text-red-400" aria-hidden="true" />}
        </button>
    );
}