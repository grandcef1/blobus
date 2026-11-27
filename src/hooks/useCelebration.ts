// ARCHITECT: поздравление — короткий импульс по свежему верному ответу, а не экран: показ гасит таймер,
// поэтому карточка не держит состояние сама, а один обработчик не расходится с другим.
// ARCHITECT: показ — производное «триггер и импульс ещё не отыграл»: сброс идёт на рендере, а не в теле
// эффекта, потому что синхронный setState в эффекте вызывает лишний кадр (тот же приём в AddWordDialog).
// ARCHITECT: триггер приходит из выбора, а не из сохранённого результата: повторный вход в чат состояние
// выбора начинает с нуля, и анимация не запускается заново.

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Полный срок поздравления: короткий импульс, а не экран. */
const CELEBRATION_MS = 1100;
const CELEBRATION_REDUCED_MS = 700;

/** Показывать ли поздравление прямо сейчас: true — свежий верный ответ, дальше таймер. */
export function useCelebration(trigger: boolean): boolean {
    const shouldReduceMotion = useReducedMotion();
    const [finished, setFinished] = useState(false);
    const [lastTrigger, setLastTrigger] = useState(trigger);

    if (lastTrigger !== trigger) {
        setLastTrigger(trigger);
        setFinished(false);
    }

    useEffect(() => {
        if (!trigger) return;

        const timer = window.setTimeout(
            () => setFinished(true),
            shouldReduceMotion ? CELEBRATION_REDUCED_MS : CELEBRATION_MS
        );

        return () => window.clearTimeout(timer);
    }, [trigger, shouldReduceMotion]);

    return trigger && !finished;
}
