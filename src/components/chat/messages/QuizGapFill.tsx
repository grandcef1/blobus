// ARCHITECT: викторина с пропуском: ответ вводится в поле и проверяется кнопкой, Enter нажимает её же.
// После верного ответа поле запирается — повторять проверку незачем; после неверного доступен повтор.

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { QuizFeedback } from "./QuizFeedback";
import { normalizeAnswer } from "./quizCheck";

interface QuizGapFillProps {
    readonly answer: string;
}

type GapFillResult = "correct" | "wrong" | null;

const FIELD =
    "min-h-11 flex-1 rounded-xl border border-white/10 bg-[#141416] px-3 text-sm text-[#f0f0f5] placeholder:text-[#f0f0f5]/25 focus-visible:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:opacity-50";
const CHECK_BUTTON =
    "flex min-h-11 shrink-0 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-[#f0f0f5]/70 transition-colors hover:border-white/25 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5] disabled:opacity-40";

export function QuizGapFill({ answer }: QuizGapFillProps) {
    const { t } = useTranslation("chat");
    const fieldId = useId();
    const [value, setValue] = useState("");
    const [result, setResult] = useState<GapFillResult>(null);

    const check = (): void => {
        if (value.trim() === "" || result === "correct") return;

        setResult(normalizeAnswer(value) === normalizeAnswer(answer) ? "correct" : "wrong");
    };

    return (
        <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <label htmlFor={fieldId} className="sr-only">
                    {t("card.answerLabel")}
                </label>
                <input
                    id={fieldId}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== "Enter") return;

                        event.preventDefault();
                        check();
                    }}
                    placeholder={t("card.answerPlaceholder")}
                    disabled={result === "correct"}
                    className={cn(FIELD, result === "wrong" && "border-red-400/40")}
                />
                <button
                    type="button"
                    onClick={check}
                    disabled={value.trim() === "" || result === "correct"}
                    className={CHECK_BUTTON}
                >
                    {t("card.check")}
                </button>
            </div>

            <QuizFeedback
                text={
                    result === null
                        ? ""
                        : result === "correct"
                          ? t("card.correct")
                          : t("quiz.incorrect")
                }
                onRetry={result === "wrong" ? () => setResult(null) : undefined}
            />
        </div>
    );
}
