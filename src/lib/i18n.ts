// ARCHITECT: единая точка инициализации i18n. Словари бандлятся локально (без http-backend):
// они весят десятки килобайт, а сетевой запрос за словарём давал бы вспышку непереведённого
// интерфейса на старте.
// ARCHITECT: ручной выбор языка пишет стор языка в localStorage под ключом blobus-lang, а детектор
// читает его на старте. Автоопределённый язык в хранилище не попадает (caches пустой).

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ruAuth from "@/locales/ru/auth.json";
import ruBilling from "@/locales/ru/billing.json";
import ruChat from "@/locales/ru/chat.json";
import ruCommon from "@/locales/ru/common.json";
import ruDashboard from "@/locales/ru/dashboard.json";
import ruDocs from "@/locales/ru/docs.json";
import ruFooter from "@/locales/ru/footer.json";
import ruLanding from "@/locales/ru/landing.json";
import ruLegal from "@/locales/ru/legal.json";
import ruOnboarding from "@/locales/ru/onboarding.json";
import ruPlacement from "@/locales/ru/placement.json";

export const SUPPORTED_LANGUAGES = ["ru", "en", "es"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "ru";
export const LANGUAGE_STORAGE_KEY = "blobus-lang";
// ARCHITECT: грузим только активный язык, остальные — ленивыми чанками: en/es уезжают из начального
// графа, ru остаётся статически как fallback и эталон типов, поэтому интерфейс никогда не покажет сырые
// ключи. Смена языка сначала грузит бандл, потом переключает, иначе интерфейс мигнёт ключами; при
// отказе загрузки остаёмся на текущем языке и не пишем localStorage.
const NAMESPACES = ["common", "landing", "footer", "auth", "legal", "billing", "dashboard", "docs", "chat", "onboarding", "placement"] as const;

type Namespace = (typeof NAMESPACES)[number];
type Bundle = Record<Namespace, Record<string, unknown>>;
const RU_RESOURCES: Bundle = {
    common: ruCommon,
    landing: ruLanding,
    footer: ruFooter,
    auth: ruAuth,
    legal: ruLegal,
    billing: ruBilling,
    dashboard: ruDashboard,
    docs: ruDocs,
    chat: ruChat,
    onboarding: ruOnboarding,
    placement: ruPlacement,
};
// ARCHITECT: загрузка идёт через баррели языков (src/locales/en|es/index.ts): Vite собирает каждый язык
// в ОДИН чанк, поэтому холодный старт с выбранным en — один запрос вместо одиннадцати. Имена экспортов
// барреля совпадают с NAMESPACES, иначе addResourceBundle положил бы переводы не в тот неймспейс.
type EnBundle = typeof import("../locales/en");
type EsBundle = typeof import("../locales/es");
const LANGUAGE_LOADERS: { en: () => Promise<EnBundle>; es: () => Promise<EsBundle> } = {
    en: () => import("../locales/en"),
    es: () => import("../locales/es"),
};

async function loadBundle(language: Exclude<LanguageCode, "ru">): Promise<Bundle> {
    const bundle: Bundle = await LANGUAGE_LOADERS[language]();
    const missing = NAMESPACES.filter((namespace) => bundle[namespace] === undefined);
    // ARCHITECT: текст ошибки латиницей: i18n-audit считает кириллицу вне комментариев, а это сообщение
    // для разработчика, а не для интерфейса.
    if (missing.length > 0) throw new Error(`bundle ${language}: missing ${missing.join(", ")}`);
    return bundle;
}
function toSupported(code: string | undefined): LanguageCode {
    const short = (code ?? "").split("-")[0]?.toLowerCase();
    return SUPPORTED_LANGUAGES.find((item) => item === short) ?? DEFAULT_LANGUAGE;
}
// ARCHITECT: caches пустой — авто-определённый язык не записывается в localStorage, поэтому
// смена языка браузера продолжает учитываться. В хранилище попадает только ручной выбор.
// load: languageOnly приводит en-US/en-GB к en; неподдерживаемые языки падают в ru.
export function detectLanguage(): LanguageCode {
    return toSupported(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? navigator.language);
}

// ARCHITECT: init синхронный (initAsync: false) и только с ru: к моменту первого рендера и к любым
// вызовам changeLanguage i18next уже инициализирован, а fallback-язык всегда лежит в ресурсах.
void i18n.use(initReactI18next).init({
    resources: { ru: RU_RESOURCES },
    lng: DEFAULT_LANGUAGE,
    initAsync: false,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: DEFAULT_LANGUAGE,
    load: "languageOnly",
    ns: [...NAMESPACES],
    defaultNS: "common",
    // ARCHITECT: React экранирует текст сам; повторное экранирование ломало бы апострофы и
    // кавычки в переводах.
    interpolation: { escapeValue: false },
});
// ARCHITECT: промис готовности догружает словарь активного языка — main.tsx монтирует App только после
// него, иначе первый кадр показал бы ru вместо выбранного языка. Сбой не роняет старт: остаёмся на ru.
// ARCHITECT: это именно функция, а не побочный эффект импорта: в тестах модуль импортируется без
// приложения, и фоновое переключение на язык jsdom ломало бы фиксированный ru из setup.
export async function loadActiveLanguage(): Promise<void> {
    const language = detectLanguage();
    if (language === DEFAULT_LANGUAGE) return;
    if (!(await ensureLanguage(language))) return;

    await i18n.changeLanguage(language);
    document.documentElement.lang = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE;
}

/** Догружает словари языка, если их ещё нет в памяти. false — загрузка не удалась. */
export async function ensureLanguage(language: LanguageCode): Promise<boolean> {
    if (i18n.hasResourceBundle(language, "common")) return true;
    // ARCHITECT: ru (DEFAULT_LANGUAGE) статичен и всегда лежит в ресурсах — грузить его нечем; сравнение
    // с литералом нужно для сужения типа до en|es, DEFAULT_LANGUAGE объявлен как LanguageCode.
    if (language === "ru") return true;

    try {
        const bundle = await loadBundle(language);
        for (const namespace of NAMESPACES) {
            i18n.addResourceBundle(language, namespace, bundle[namespace], true, true);
        }
        return true;
    } catch {
        return false;
    }
}

// ARCHITECT: <html lang> следует за языком интерфейса при любом переключении, не только на старте.
i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
});

// ARCHITECT: ключи t() типизированы по ru-словарю — опечатка в ключе становится ошибкой сборки, а не
// пустой строкой в интерфейсе. ru выбран эталоном: он основной язык продукта.
declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "common";
        resources: {
            common: typeof ruCommon;
            landing: typeof ruLanding;
            footer: typeof ruFooter;
            auth: typeof ruAuth;
            legal: typeof ruLegal;
            billing: typeof ruBilling;
            dashboard: typeof ruDashboard;
            docs: typeof ruDocs;
            chat: typeof ruChat;
            onboarding: typeof ruOnboarding;
            placement: typeof ruPlacement;
        };
    }
}

export default i18n;
