// ARCHITECT: обратный отсчёт повторной отправки. Хук один на два потребителя (сброс пароля и
// подтверждение почты): правило «не чаще раза в 60 секунд» должно совпадать, а не жить копией в двух
// формах. Время хранится в состоянии, интервал — в ref: очистка на размонтировании обязательна,
// иначе таймер переживёт форму и дёрнет setState у мёртвого компонента.

import { useCallback, useEffect, useRef, useState } from "react";

export interface Cooldown {
    /** Сколько секунд осталось; 0 — повтор разрешён. */
    remaining: number;
    start: () => void;
    active: boolean;
}

export function useCooldown(seconds: number): Cooldown {
    const [remaining, setRemaining] = useState(0);
    const timerRef = useRef<number | null>(null);

    const stop = useCallback(() => {
        if (timerRef.current === null) return;
        window.clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const start = useCallback(() => {
        stop();
        setRemaining(seconds);
        timerRef.current = window.setInterval(() => {
            setRemaining((value) => Math.max(0, value - 1));
        }, 1000);
    }, [seconds, stop]);

    // ARCHITECT: остановка вынесена из апдейтера состояния: React может вызвать его дважды
    // (StrictMode), а побочные эффекты в апдейтере — не место для clearInterval.
    useEffect(() => {
        if (remaining === 0) stop();
    }, [remaining, stop]);

    useEffect(() => stop, [stop]);

    return { remaining, start, active: remaining > 0 };
}