// ARCHITECT: посимвольная выдача ответа: текст печатается с искусственной задержкой, чтобы поток ощущался живым.
// Хук визуальный: настоящий текст уже пришёл целиком, поэтому при prefers-reduced-motion он отдаётся сразу, а
// озвучка и сохранение работают с полным текстом, а не с напечатанной частью.
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

// ARCHITECT: 24 мс на два символа — примерно 80 символов в секунду: похоже на быстрый набор и не тормозит
// чтение. Шаг и задержка не выводятся в настройки: это подача, а не параметр продукта.
const REVEAL_INTERVAL_MS = 24;
const REVEAL_STEP = 2;

/** Сколько символов текста показывать сейчас. */
export function useTypedText(content: string, animate: boolean): string {
    const shouldReduceMotion = useReducedMotion();
    const [shown, setShown] = useState(() => (animate ? 0 : content.length));
    const isDone = !animate || shouldReduceMotion || shown >= content.length;

    // ARCHITECT: цепочка setTimeout вместо интервала: каждый шаг — одна отрисовка, а следующий шаг ставится
    // только после показа предыдущего, поэтому лишних обновлений нет. Зависимость от shown обязательна:
    // без неё цепочка обрывалась бы после первого шага.
    useEffect(() => {
        if (isDone) return;

        const timer = window.setTimeout(() => {
            setShown((previous) => Math.min(content.length, previous + REVEAL_STEP));
        }, REVEAL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [content.length, isDone, shown]);

    return isDone ? content : content.slice(0, shown);
}
