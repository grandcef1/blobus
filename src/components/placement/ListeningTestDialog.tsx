// ARCHITECT: аудирование вынесено в отдельный диалог: в адаптивный тест оно не входит, потому что
// требует озвучки. audioText читает синтезатор речи браузера (en-US) — сетевых запросов нет.
// ARCHITECT: реальная оценка понимания на слух и произношения появится на бэкенде позже; здесь
// уровень считается по числу верных ответов (estimateListeningLevel) — это мок-оценка.

import { useEffect, useState } from "react";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { saveListeningResult } from "@/api/placement";
import { estimateListeningLevel } from "@/lib/placement";
import { speakEnglish, stopSpeaking } from "@/lib/speech";
import type { EnglishLevel } from "@/types/onboarding";
import { ListeningQuestion } from "@/components/placement/ListeningQuestion";
import { ListeningResultView } from "@/components/placement/ListeningResultView";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_BUTTON } from "@/lib/surfaces";

interface ListeningTestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: (level: EnglishLevel) => void;
}

export function ListeningTestDialog({ open, onOpenChange, onSaved }: ListeningTestDialogProps) {
    const [index, setIndex] = useState(0);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [level, setLevel] = useState<EnglishLevel | null>(null);
    const [lastOpen, setLastOpen] = useState(open);

    // ARCHITECT: каждое открытие начинает проверку с первого задания: возвращаться в середину
    // чужого прогона незачем. Сброс идёт на рендере — setState в теле эффекта запрещён правилом
    // react-hooks/set-state-in-effect.
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) {
            setIndex(0);
            setSelectedOptionId(null);
            setCorrectCount(0);
            setLevel(null);
        }
    }

    const item = LISTENING_ITEMS[index];
    const isAnswered = selectedOptionId !== null;
    const isLast = index === LISTENING_ITEMS.length - 1;
    const audioText = item.audioText ?? "";

    // ARCHITECT: задание озвучивается само при показе, иначе первый шаг всегда «нажми кнопку».
    useEffect(() => {
        if (!open || level !== null) return;
        speakEnglish(audioText);
    }, [open, index, level, audioText]);

    // ARCHITECT: закрытие диалога и размонтирование обязаны снять озвучку: иначе голос продолжает
    // читать поверх следующего экрана.
    useEffect(() => {
        if (!open) stopSpeaking();
    }, [open]);

    useEffect(() => stopSpeaking, []);

    const handleSelect = (optionId: string) => {
        if (isAnswered) return;
        setSelectedOptionId(optionId);
        if (optionId === item.correctOptionId) setCorrectCount((previous) => previous + 1);
    };

    const handleNext = () => {
        if (!isLast) {
            setIndex((previous) => previous + 1);
            setSelectedOptionId(null);
            return;
        }

        // ARCHITECT: последний верный ответ уже учтён в correctCount — он записан при выборе.
        const finalLevel = estimateListeningLevel(correctCount, LISTENING_ITEMS.length);
        stopSpeaking();
        setLevel(finalLevel);
        saveListeningResult(finalLevel);
        onSaved?.(finalLevel);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Аудирование</DialogTitle>
                <DialogDescription>
                    Озвучку читает синтезатор речи. Проверяется понимание на слух, а не произношение.
                </DialogDescription>

                {level === null ? (
                    <ListeningQuestion
                        item={item}
                        number={index + 1}
                        total={LISTENING_ITEMS.length}
                        selectedOptionId={selectedOptionId}
                        onSelect={handleSelect}
                        onReplay={() => speakEnglish(audioText)}
                    />
                ) : (
                    <ListeningResultView
                        level={level}
                        correctCount={correctCount}
                        total={LISTENING_ITEMS.length}
                    />
                )}

                <DialogFooter>
                    {level === null ? (
                        <Button
                            type="button"
                            className={PRIMARY_BUTTON}
                            onClick={handleNext}
                            disabled={!isAnswered}
                        >
                            {isLast ? "Завершить" : "Дальше"}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className={PRIMARY_BUTTON}
                            onClick={() => onOpenChange(false)}
                        >
                            Готово
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}