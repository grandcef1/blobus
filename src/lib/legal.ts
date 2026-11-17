// ARCHITECT: единый источник правды для правовых страниц. Здесь только структурные данные —
// имена собственные, адреса, идентификаторы: их правят один раз, а не в трёх словарях. Все тексты
// живут в src/locales/{ru,en,es}/legal.json, поэтому состав обработчиков нельзя рассинхронизировать
// между языками.

export const OPERATOR_CONTACT_EMAIL = "blobus.support@gmail.com";
export const LEGAL_EFFECTIVE_DATE = "2026-11-16";

// ARCHITECT: brand=null — платёжный провайдер ещё не выбран (Stripe в Беларуси недоступен), поэтому
// в таблице стоит переводимая подпись «уточняется», а не выдуманный бренд.
export const DATA_PROCESSORS = [
    { id: "vercel", brand: "Vercel", status: "now" },
    { id: "supabase", brand: "Supabase", status: "later" },
    { id: "openai", brand: "OpenAI", status: "later" },
    { id: "sentry", brand: "Sentry", status: "later" },
    { id: "vercelAnalytics", brand: "Vercel Analytics / Speed Insights", status: "later" },
    { id: "payments", brand: null, status: "later" },
] as const;

export type ProcessorId = (typeof DATA_PROCESSORS)[number]["id"];
export type ProcessorStatus = (typeof DATA_PROCESSORS)[number]["status"];

// ARCHITECT: необходимое хранилище согласия не требует — это и есть работа сервиса, поэтому список
// фиксирован. Имена ключей совпадают с реальными persist-ключами (store/auth, детектор i18n,
// store/consent): иначе страница обещала бы не то, что лежит в браузере.
export const NECESSARY_STORAGE_ITEMS = [
    { id: "auth", name: "blobus-auth" },
    { id: "lang", name: "blobus-lang" },
    { id: "consent", name: "blobus-consent" },
] as const;

export type StorageItemId = (typeof NECESSARY_STORAGE_ITEMS)[number]["id"];

// ARCHITECT: перечень правовых документов — один список для перекрёстной навигации и скелетона:
// добавили документ, он сам появился и в ссылках, и в заглушке загрузки.
export const LEGAL_PAGES = [
    { id: "privacy", path: "/privacy", labelKey: "legal.layout.nav.privacy" },
    { id: "terms", path: "/terms", labelKey: "legal.layout.nav.terms" },
    { id: "cookies", path: "/cookies", labelKey: "legal.layout.nav.cookies" },
] as const;

export type LegalPageId = (typeof LEGAL_PAGES)[number]["id"];

// ARCHITECT: дата вступления хранится ISO-строкой — её видно в коде и в диффе. Date собираем из
// частей, а не new Date("2026-11-16"): строку без времени движок читает как UTC-полночь, и в
// западных часовых поясах страница показывала бы предыдущий день.
export function legalEffectiveDate(): Date {
    const [year, month, day] = LEGAL_EFFECTIVE_DATE.split("-").map(Number);
    return new Date(year, month - 1, day);
}
