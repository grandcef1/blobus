// ARCHITECT: JSON-LD собран здесь, а не на страницах: одна сущность — одно описание, и правка
// контакта или логотипа не разъезжается по файлам.
// ARCHITECT: FAQPage берётся из ru-словаря лендинга, а не из текущего языка интерфейса: канонический
// язык SEO — ru, и разметка обязана совпадать с тем, что отдаёт prerender (scripts/prerender.mjs
// читает тот же JSON).

import { OPERATOR_CONTACT_EMAIL } from "@/lib/legal";
import { SITE_URL, absoluteUrl, findSeoRoute, normalizeRoutePath } from "@/lib/seo";
import ruLanding from "@/locales/ru/landing.json";

export interface JsonLdObject {
    readonly "@context": string;
    // ARCHITECT: @type необязателен: у узла с @graph его несёт каждая сущность внутри, а не контейнер.
    readonly "@type"?: string;
    readonly [key: string]: unknown;
}

const SCHEMA_CONTEXT = "https://schema.org";
// ARCHITECT: имя корневой крошки — единственная строка разметки, которой нет в словарях: в legal.json
// лежит подпись ссылки («На главную»), а крошке нужно имя страницы.
const HOME_CRUMB_NAME = "Главная";

export const ORGANIZATION: JsonLdObject = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: "Blobus",
    url: SITE_URL,
    logo: `${SITE_URL}/blobatar-icon.png`,
    contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: OPERATOR_CONTACT_EMAIL,
        availableLanguage: ["ru", "en", "es"],
    },
};

export const WEBSITE: JsonLdObject = {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: "Blobus",
    url: SITE_URL,
    inLanguage: "ru",
};

// ARCHITECT: price 0 — бесплатный тариф Blobus Free: на лендинге он основной, поэтому приложение
// объявлено бесплатным, а не «от $3».
export const SOFTWARE_APPLICATION: JsonLdObject = {
    "@context": SCHEMA_CONTEXT,
    "@type": "SoftwareApplication",
    name: "Blobus",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

// ARCHITECT: порядок вопросов — порядок ключей в ru-словаре: он же порядок карточек в FaqSection,
// поэтому отдельный список id для разметки не нужен.
export const HOME_FAQ: JsonLdObject = {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: Object.values(ruLanding.faq.items).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
            "@type": "Answer",
            text: item.full,
        },
    })),
};

// ARCHITECT: @graph — один script на страницу: три сущности сайта плюс FAQ лендинга связаны общим
// контекстом, а не тремя отдельными блоками разметки.
export const HOME_JSON_LD: JsonLdObject = {
    "@context": SCHEMA_CONTEXT,
    "@graph": [ORGANIZATION, WEBSITE, SOFTWARE_APPLICATION, HOME_FAQ],
};

// ARCHITECT: крошки для правовых страниц и центра помощи. Имя второго уровня — заголовок страницы из
// seo-routes.json: второго источника названий не появляется.
export function breadcrumbForRoute(path: string): JsonLdObject {
    const routePath = normalizeRoutePath(path);
    const route = findSeoRoute(routePath);

    return {
        "@context": SCHEMA_CONTEXT,
        "@type": "BreadcrumbList",
        itemListElement: [
            { "@type": "ListItem", position: 1, name: HOME_CRUMB_NAME, item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: route?.title ?? routePath, item: absoluteUrl(routePath) },
        ],
    };
}
