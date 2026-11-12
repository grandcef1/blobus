// ARCHITECT: диалог аудирования — тонкая обёртка над общим потоком: озвучка, лимит прослушиваний и
// счёт уровня живут в ListeningFlow, поэтому шаг мастера и карточка «Обзора» ведут себя одинаково.
// ARCHITECT: реальная оценка понимания на слух и произношения появится на бэкенде позже; здесь
// уровень считается по числу верных ответов (estimateListeningLevel) — это мок-оценка.

import { useEffect, useState } from "react";
import { LISTENING_ITEMS } from "@/api/mocks/listeningTest";
import { saveListeningResult } from "@/api/placement";
import { stopSpeaking } from "@/lib/speech";
import type { EnglishLevel } from "@/types/onboarding";
import { ListeningFlow } from "@/components/placement/ListeningFlow";
import type { ListeningOutcome } from "@/components/placement/ListeningFlow";
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
    const [outcome, setOutcome] = useState<ListeningOutcome | null>(null);
    const [lastOpen, setLastOpen] = useState(open);

    // ARCHITECT: каждое открытие начинает проверку заново: возвращаться в середину чужого прогона
    // незачем. Сброс идёт на рендере — setState в теле эффекта запрещён правилом
    // react-hooks/set-state-in-effect.
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setOutcome(null);
    }

    // ARCHITECT: закрытие диалога снимает озвучку: голос не должен читать поверх следующего экрана.
    useEffect(() => {
        if (!open) stopSpeaking();
    }, [open]);

    const handleComplete = (next: ListeningOutcome) => {
        stopSpeaking();
        setOutcome(next);
        saveListeningResult(next.level);
        onSaved?.(next.level);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Аудирование</DialogTitle>
                <DialogDescription>
                    Озвучку читает синтезатор речи: два прослушивания на задание. Проверяется
                    понимание на слух, а не произношение.
                </DialogDescription>

                {outcome === null ? (
                    <ListeningFlow onComplete={handleComplete} />
                ) : (
                    <>
                        <ListeningResultView
                            level={outcome.level}
                            correctCount={outcome.correctCount}
                            total={LISTENING_ITEMS.length}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                className={PRIMARY_BUTTON}
                                onClick={() => onOpenChange(false)}
                            >
                                Готово
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}