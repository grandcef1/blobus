// ARCHITECT: поток аудирования один для двух точек входа: шаг «Тест» мастера и диалог из «Обзора».
// Логика озвучки, лимита прослушиваний и подсчёта уровня живёт здесь, поэтому обе точки ведут
// себя одинаково, а не по-разному после правки одной из них.
// ARCHITECT: автоозвучки нет — звук только по кнопке: голос, начинавший читать при открытии,
// пугал и мешал прочитать вопрос.

import { useEffect, useState } from "react";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { estimateListeningLevel } from "@/lib/placement";
import { speakEnglish, stopSpeaking } from "@/lib/speech";
import type { EnglishLevel } from "@/types/onboarding";
import { ListeningQuestion } from "./ListeningQuestion";
import { Button } from "@/components/ui/button";
import { PRIMARY_BUTTON } from "@/lib/surfaces";

export interface ListeningOutcome {
    level: EnglishLevel;
    correctCount: number;
}

interface ListeningFlowProps {
    onComplete: (outcome: ListeningOutcome) => void;
}

/** Два прослушивания на задание: третье кнопка запрещает. */
const MAX_PLAYS = 2;

export function ListeningFlow({ onComplete }: ListeningFlowProps) {
    const [index, setIndex] = useState(0);
    const [plays, setPlays] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [correctCount, setCorrectCount] = useState(0);

    const item = LISTENING_ITEMS[index];
    const isAnswered = selectedOptionId !== null;
    const isLast = index === LISTENING_ITEMS.length - 1;

    // ARCHITECT: размонтирование потока обязано снять звук: голос не должен читать поверх
    // следующего экрана.
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
            // ARCHITECT: счётчик прослушиваний сбрасывается на каждом задании.
            setPlays(0);
            setSelectedOptionId(null);
            return;
        }

        // ARCHITECT: последний верный ответ уже учтён в correctCount — он записан при выборе.
        onComplete({
            level: estimateListeningLevel(correctCount, LISTENING_ITEMS.length),
            correctCount,
        });
    };

    return (
        <div>
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

            <div className="mt-5 flex justify-end">
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