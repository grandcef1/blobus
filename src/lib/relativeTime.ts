// ARCHITECT: numeric: "auto" даёт естественные формы («вчера», «позавчера») для 1-2 дней — это лучше,
// чем «1 день назад»/«2 дня назад». Edge case: 13 часов округляется до 1 дня и отображается как «вчера»,
// даже если это тот же календарный день; в естественной речи это приемлемо, календарная логика не добавляется.

import i18n from "@/lib/i18n";

// ARCHITECT: платформенный Intl даёт корректные склонения по числу для всех трёх языков и не требует
// ключей; язык берётся в момент вызова, поэтому смена интерфейса меняет и относительное время.
const MINUTE_MS = 60000;
const HOUR_MS = MINUTE_MS * 60;
const DAY_MS = HOUR_MS * 24;

export function formatRelativeTime(timestamp: number): string {
    const elapsed = Date.now() - timestamp;
    const relative = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });

    if (elapsed < MINUTE_MS) return relative.format(0, "second");
    if (elapsed < HOUR_MS) return relative.format(-Math.round(elapsed / MINUTE_MS), "minute");
    if (elapsed < DAY_MS) return relative.format(-Math.round(elapsed / HOUR_MS), "hour");
    if (elapsed < DAY_MS * 31) return relative.format(-Math.round(elapsed / DAY_MS), "day");

    return new Date(timestamp).toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
}
