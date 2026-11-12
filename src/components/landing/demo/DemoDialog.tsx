// ARCHITECT: модальный пример урока вместо якоря на секцию лендинга: честное демо формата без
// видео и без записи в мастер. Шаги раскрываются по одному — так виден ритм диалога, а не стена
// текста. Фокус-трап, Esc и клик по оверлею даёт Radix Dialog.
// ARCHITECT: последний шаг меняет главное действие на переход в мастер: после показанного примера
// следующий осмысленный шаг — начать заниматься, а не листать дальше.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEMO_LESSON } from "@/api/mocks/demoLesson";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { GHOST_BUTTON, PRIMARY_BUTTON } from "@/lib/surfaces";
import { DemoStep } from "./DemoStep";

interface DemoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DemoDialog({ open, onOpenChange }: DemoDialogProps) {
    const navigate = useNavigate();
    const [stepIndex, setStepIndex] = useState(0);
    const [lastOpen, setLastOpen] = useState(open);
    const bottomRef = useRef<HTMLDivElement>(null);

    // ARCHITECT: каждое открытие начинает показ с начала: возвращаться в середину чужого
    // разговора пользователю незачем. Сброс идёт на рендере, а не в эффекте: правило
    // react-hooks/set-state-in-effect запрещает setState в теле эффекта, и сравнение с прошлым
    // значением на рендере — рекомендованный React способ для такого сброса.
    if (lastOpen !== open) {
        setLastOpen(open);
        if (open) setStepIndex(0);
    }

    // ARCHITECT: новый шаг должен попадать в поле зрения — лента растёт вниз внутри модалки.
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [stepIndex]);

    const visibleSteps = DEMO_LESSON.slice(0, stepIndex + 1);
    const isLastStep = stepIndex === DEMO_LESSON.length - 1;

    const handlePrimary = () => {
        if (isLastStep) {
            onOpenChange(false);
            navigate("/onboarding");
            return;
        }

        setStepIndex((previous) => previous + 1);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogTitle>Пример урока</DialogTitle>
                <DialogDescription>
                    Так выглядит диалог с репетитором: ответ, мягкая правка и новая лексика.
                </DialogDescription>

                <div
                    aria-live="polite"
                    className="mt-4 flex max-h-[min(24rem,50dvh)] flex-col gap-3 overflow-y-auto"
                >
                    {visibleSteps.map((step) => (
                        <DemoStep key={step.id} step={step} />
                    ))}
                    <div ref={bottomRef} />
                </div>

                <DialogFooter className="justify-between">
                    <span className="text-xs tabular-nums text-[#f0f0f5]/40">
                        Шаг {stepIndex + 1} из {DEMO_LESSON.length}
                    </span>

                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className={GHOST_BUTTON}
                            onClick={() => onOpenChange(false)}
                        >
                            Закрыть
                        </Button>
                        <Button type="button" className={PRIMARY_BUTTON} onClick={handlePrimary}>
                            {isLastStep ? "Начать бесплатно" : "Дальше"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
