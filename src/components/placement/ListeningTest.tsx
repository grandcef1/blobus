// ARCHITECT: тест аудирования один для двух контекстов: шаг мастера (opt-in) и отдельный экран
// /app/listening из «Обзора». Полосу прогресса мастера рисует OnboardingShell, поэтому здесь её нет
// ни в одном контексте — иначе на отдельном экране появлялась бы чужая навигация.
// ARCHITECT: автоозвучки нет: запись читает синтезатор речи только по клику, а число прослушиваний
// ограничено двумя — задание проверяет понимание на слух, а не вслушивание.
// ARCHITECT: сам тест ничего не сохраняет: результат уходит наверх через onComplete, поэтому запись
// уровня остаётся в одном месте — у мастера и у экрана.

import { useEffect, useState } from "react";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { estimateListeningLevel } from "@/lib/placement";
import { speakEnglish, stopSpeaking } from "@/lib/speech";
import type { ListeningContext, ListeningResult } from "@/types/placement";
import { ListeningIntro } from "./listening/ListeningIntro";
import { ListeningQuestion } from "./ListeningQuestion";
import { ListeningResultView } from "./ListeningResultView";
import { Button } from "@/components/ui/button";
import { PRIMARY_BUTTON } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

interface ListeningTestProps {
    context: ListeningContext;
    onComplete: (result: ListeningResult) => void;
    /** Выход из незаконченного теста: есть только там, где тест открыт отдельным экраном. */
    onExit?: () => void;
}

/** Два прослушивания на задание: третье кнопка запрещает. */
const MAX_PLAYS = 2;
/** Поверхность карточки дашборда: на отдельном экране блок читается как остальные карточки. */
const STANDALONE_CARD = "rounded-2xl border border-white/5 bg-[#111113] p-4 md:p-5";

type ListeningPhase = "intro" | "test" | "result";

export function ListeningTest({ context, onComplete, onExit }: ListeningTestProps) {
    const [phase, setPhase] = useState<ListeningPhase>("intro");
    const [index, setIndex] = useState(0);
    const [plays, setPlays] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [result, setResult] = useState<ListeningResult | null>(null);

    const item = LISTENING_ITEMS[index];
    const isAnswered = selectedOptionId !== null;
    const isLast = index === LISTENING_ITEMS.length - 1;
    const isStandalone = context === "standalone";

    // ARCHITECT: размонтирование обязано снять звук: голос не должен читать поверх следующего экрана.
    useEffect(() => stopSpeaking, []);

    const handlePlay = () => {
        if (plays >= MAX_PLAYS) return;

        setPlays((previous) => previous + 1);
        speakEnglish(item.audioText ?? "");
    };

    const handleSelect = (optionId: string) => {
        if (isAnswered) return;

        setSelectedOptionId(optionId);
        if (optionId === item.correctOptionId) setCorrectCount((previous) => previous + 1);
    };

    const handleNext = () => {
        stopSpeaking();

        if (!isLast) {
            setIndex((previous) => previous + 1);
            // ARCHITECT: счётчик прослушиваний и выбор сбрасываются на каждом задании.
            setPlays(0);
            setSelectedOptionId(null);
            return;
        }

        // ARCHITECT: итог считается здесь, а не эффектом: это данные одного перехода, и уровень
        // попадает на экран сводки, а не в побочный эффект рендера.
        setResult({
            level: estimateListeningLevel(correctCount, LISTENING_ITEMS.length),
            correctCount,
        });
        setPhase("result");
    };

    if (phase === "intro") {
        return <ListeningIntro context={context} onStart={() => setPhase("test")} />;
    }

    if (phase === "result" && result !== null) {
        return (
            <div className={cn(isStandalone && STANDALONE_CARD)}>
                <ListeningResultView
                    level={result.level}
                    correctCount={result.correctCount}
                    total={LISTENING_ITEMS.length}
                />

                <div className="mt-5 flex justify-end">
                    <Button type="button" className={PRIMARY_BUTTON} onClick={() => onComplete(result)}>
                        Готово
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(isStandalone && STANDALONE_CARD)}>
            <ListeningQuestion
                item={item}
                number={index + 1}
                total={LISTENING_ITEMS.length}
                plays={plays}
                maxPlays={MAX_PLAYS}
                selectedOptionId={selectedOptionId}
                onSelect={handleSelect}
                onPlay={handlePlay}
            />

            <div className="mt-5 flex items-center justify-between gap-3">
                {onExit ? (
                    <button
                        type="button"
                        onClick={onExit}
                        className="flex min-h-11 items-center rounded-full px-3 text-sm text-[#f0f0f5]/50 transition-colors hover:bg-white/5 hover:text-[#f0f0f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0f0f5]"
                    >
                        Выйти
                    </button>
                ) : (
                    <span />
                )}

                <Button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={handleNext}
                    disabled={!isAnswered}
                >
                    {isLast ? "Завершить" : "Дальше"}
                </Button>
            </div>
        </div>
    );
}