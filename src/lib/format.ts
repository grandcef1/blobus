// ARCHITECT: даты и суммы форматирует Intl по текущему языку интерфейса: строки дат не лежат в
// словарях — иначе каждый формат перевода пришлось бы поддерживать руками.
// ARCHITECT: форматтеры кэшируются по локали: Intl создаётся дорого, а локаль за сеанс меняется
// редко, поэтому повторная сборка формата на каждый рендер списка платежей не нужна.

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatDate(iso: string, locale: string): string {
    let formatter = dateFormatters.get(locale);
    if (formatter === undefined) {
        formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
        dateFormatters.set(locale, formatter);
    }
    return formatter.format(new Date(iso));
}

export function formatUsd(amount: number, locale: string): string {
    let formatter = currencyFormatters.get(locale);
    if (formatter === undefined) {
        formatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" });
        currencyFormatters.set(locale, formatter);
    }
    return formatter.format(amount);
}
