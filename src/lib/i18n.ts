// ARCHITECT: единая точка инициализации i18n. Словари бандлятся локально (без http-backend):
// они весят десятки килобайт, а сетевой запрос за словарём давал бы вспышку непереведённого
// интерфейса на старте.
// ARCHITECT: выбранный язык хранит детектор в localStorage под ключом blobus-lang — смена языка и
// его сохранение это одна операция, отдельного persist-слоя не нужно.

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "@/locales/en/auth.json";
import enBilling from "@/locales/en/billing.json";
import enCommon from "@/locales/en/common.json";
import enFooter from "@/locales/en/footer.json";
import enLanding from "@/locales/en/landing.json";
import enLegal from "@/locales/en/legal.json";
import esAuth from "@/locales/es/auth.json";
import esBilling from "@/locales/es/billing.json";
import esCommon from "@/locales/es/common.json";
import esFooter from "@/locales/es/footer.json";
import esLanding from "@/locales/es/landing.json";
import esLegal from "@/locales/es/legal.json";
import ruAuth from "@/locales/ru/auth.json";
import ruBilling from "@/locales/ru/billing.json";
import ruCommon from "@/locales/ru/common.json";
import ruFooter from "@/locales/ru/footer.json";
import ruLanding from "@/locales/ru/landing.json";
import ruLegal from "@/locales/ru/legal.json";

export const SUPPORTED_LANGUAGES = ["ru", "en", "es"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: LanguageCode = "ru";
export const LANGUAGE_STORAGE_KEY = "blobus-lang";

const NAMESPACES = ["common", "landing", "footer", "auth", "legal", "billing"] as const;

const resources = {
    ru: {
        common: ruCommon,
        landing: ruLanding,
        footer: ruFooter,
        auth: ruAuth,
        legal: ruLegal,
        billing: ruBilling,
    },
    en: {
        common: enCommon,
        landing: enLanding,
        footer: enFooter,
        auth: enAuth,
        legal: enLegal,
        billing: enBilling,
    },
    es: {
        common: esCommon,
        landing: esLanding,
        footer: esFooter,
        auth: esAuth,
        legal: esLegal,
        billing: esBilling,
    },
};

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: DEFAULT_LANGUAGE,
        ns: [...NAMESPACES],
        defaultNS: "common",
        // ARCHITECT: React экранирует текст сам; повторное экранирование ломало бы апострофы и
        // кавычки в переводах.
        interpolation: { escapeValue: false },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
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
        };
    }
}

export default i18n;
