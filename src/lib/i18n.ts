// ARCHITECT: единая точка инициализации i18n. Словари бандлятся локально (без http-backend):
// они весят десятки килобайт, а сетевой запрос за словарём давал бы вспышку непереведённого
// интерфейса на старте.
// ARCHITECT: ручной выбор языка пишет стор языка в localStorage под ключом blobus-lang, а детектор
// читает его на старте. Автоопределённый язык в хранилище не попадает (caches пустой).

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "@/locales/en/auth.json";
import enBilling from "@/locales/en/billing.json";
import enChat from "@/locales/en/chat.json";
import enCommon from "@/locales/en/common.json";
import enDashboard from "@/locales/en/dashboard.json";
import enFooter from "@/locales/en/footer.json";
import enLanding from "@/locales/en/landing.json";
import enLegal from "@/locales/en/legal.json";
import enOnboarding from "@/locales/en/onboarding.json";
import esAuth from "@/locales/es/auth.json";
import esBilling from "@/locales/es/billing.json";
import esChat from "@/locales/es/chat.json";
import esCommon from "@/locales/es/common.json";
import esDashboard from "@/locales/es/dashboard.json";
import esFooter from "@/locales/es/footer.json";
import esLanding from "@/locales/es/landing.json";
import esLegal from "@/locales/es/legal.json";
import esOnboarding from "@/locales/es/onboarding.json";
import ruAuth from "@/locales/ru/auth.json";
import ruBilling from "@/locales/ru/billing.json";
import ruChat from "@/locales/ru/chat.json";
import ruCommon from "@/locales/ru/common.json";
import ruDashboard from "@/locales/ru/dashboard.json";
import ruFooter from "@/locales/ru/footer.json";
import ruLanding from "@/locales/ru/landing.json";
import ruLegal from "@/locales/ru/legal.json";
import ruOnboarding from "@/locales/ru/onboarding.json";

export const SUPPORTED_LANGUAGES = ["ru", "en", "es"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "ru";
export const LANGUAGE_STORAGE_KEY = "blobus-lang";

const NAMESPACES = ["common", "landing", "footer", "auth", "legal", "billing", "dashboard", "chat", "onboarding"] as const;

const resources = {
    ru: {
        common: ruCommon,
        landing: ruLanding,
        footer: ruFooter,
        auth: ruAuth,
        legal: ruLegal,
        billing: ruBilling,
        dashboard: ruDashboard,
        chat: ruChat,
        onboarding: ruOnboarding,
    },
    en: {
        common: enCommon,
        landing: enLanding,
        footer: enFooter,
        auth: enAuth,
        legal: enLegal,
        billing: enBilling,
        dashboard: enDashboard,
        chat: enChat,
        onboarding: enOnboarding,
    },
    es: {
        common: esCommon,
        landing: esLanding,
        footer: esFooter,
        auth: esAuth,
        legal: esLegal,
        billing: esBilling,
        dashboard: esDashboard,
        chat: esChat,
        onboarding: esOnboarding,
    },
};

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: DEFAULT_LANGUAGE,
        load: "languageOnly",
        ns: [...NAMESPACES],
        defaultNS: "common",
        // ARCHITECT: React экранирует текст сам; повторное экранирование ломало бы апострофы и
        // кавычки в переводах.
        interpolation: { escapeValue: false },
        // ARCHITECT: caches пустой — авто-определённый язык не записывается в localStorage, поэтому
        // смена языка браузера продолжает учитываться. В хранилище попадает только ручной выбор.
        // load: languageOnly приводит en-US/en-GB к en; неподдерживаемые языки падают в ru.
        detection: {
            order: ["localStorage", "navigator"],
            caches: [],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
    })
    .then(() => {
        document.documentElement.lang = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE;
    });

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
            chat: typeof ruChat;
            onboarding: typeof ruOnboarding;
        };
    }
}

export default i18n;
