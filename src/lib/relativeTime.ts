// ARCHITECT: относительное время последней активности — вместо абсолютной даты, потому что
// вопрос «когда я занимался» читается как «два часа назад», а не как число. Формат ru,
// без «сегодня/вчера»: они путаются при переходе через полночь.

const MINUTE_MS = 60000;
const HOUR_MS = MINUTE_MS * 60;
const DAY_MS = HOUR_MS * 24;

export function formatRelativeTime(timestamp: number): string {
    const elapsed = Date.now() - timestamp;

    if (elapsed < MINUTE_MS) return "только что";
    if (elapsed < HOUR_MS) return `${Math.round(elapsed / MINUTE_MS)} мин назад`;
    if (elapsed < DAY_MS) return `${Math.round(elapsed / HOUR_MS)} ч назад`;
    if (elapsed < DAY_MS * 31) return `${Math.round(elapsed / DAY_MS)} дн назад`;

    return new Date(timestamp).toLocaleDateString("ru", { day: "numeric", month: "short" });
}
