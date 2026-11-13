// ARCHITECT: тест аудирования один для двух контекстов: шаг мастера (opt-in) и отдельный экран
// /listening, куда ведут карточка «Обзора» и сводка теста. Полосу прогресса мастера рисует
// OnboardingShell, поэтому здесь её нет ни в одном контексте — иначе на отдельном экране появлялась
// бы чужая навигация.
// ARCHITECT: автоозвучки нет: запись читает синтезатор речи только по клику, а число прослушиваний
// ограничено двумя — задание проверяет понимание на слух, а не вслушивание.
// ARCHITECT: сам тест ничего не сохраняет: результат уходит наверх через onComplete, поэтому запись
// уровня остаётся в одном месте — у мастера и у экрана.
// ARCHITECT: контекст решает, где показывается итог. В мастере сводка идёт внутри шага и следом
// открывается сводка уровня, поэтому тест показывает свой итог сам; на отдельном экране итог рисует
// экран — двух сводок подряд не бывает.

import { useEffect, useState } from "react";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { estimateListeningLevel } from "@/lib/placement";
import { speakEnglish, stopSpeaking } from "@/lib/speech";
import type { ListeningContext, ListeningResult } from "@/types/placement";
import { ListeningIntro } from "./listening/ListeningIntro";
import { ListeningQuestionStep } from "./listening/ListeningQuestionStep";
import { ListeningResultView } from "./ListeningResultView";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/onboarding/StepCard";
import { PRIMARY_BUTTON } from "@/lib/surfaces";

interface ListeningTestProps {
    context: ListeningContext;
    onComplete: (result: ListeningResult) => void;
    /** Выход из незаконченного теста: есть только на отдельном экране. */
    onExit?: () => void;
}

/** Два прослушивания на задание: третье кнопка запрещает. */
const MAX_PLAYS = 2;

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
        const summary: ListeningResult = {
            level: estimateListeningLevel(correctCount, LISTENING_ITEMS.length),
            correctCount,
        };

        // ARCHITECT: на отдельном экране итог рисует сам экран, поэтому тест отдаёт результат сразу
        // после последнего ответа — двух сводок подряд не бывает.
        if (isStandalone) {
            onComplete(summary);
            return;
        }

        setResult(summary);
        setPhase("result");
    };

    if (phase === "intro") {
        return <ListeningIntro onStart={() => setPhase("test")} onExit={onExit} />;
    }

    if (phase === "result" && result !== null) {
        return (
            <StepCard>
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
            </StepCard>
        );
    }

    return (
        <ListeningQuestionStep
            item={item}
            number={index + 1}
            total={LISTENING_ITEMS.length}
            plays={plays}
            maxPlays={MAX_PLAYS}
            selectedOptionId={selectedOptionId}
            isLast={isLast}
            onSelect={handleSelect}
            onPlay={handlePlay}
            onNext={handleNext}
            onExit={onExit}
        />
    );
}