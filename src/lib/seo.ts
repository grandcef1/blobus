// ARCHITECT: SEO-контур держится на одном источнике правды — seo-routes.json. Его читают и клиент
// (src/components/shared/Seo.tsx), и prerender (scripts/prerender.mjs), поэтому статический HTML и
// React-метаданные не могут разойтись по заголовкам.
// ARCHITECT: канонический язык SEO — ru, locale-URL и hreflang — отдельная волна: адрес остаётся
// один (SITE_URL + path), без /en и /es.

import seoRoutes from "./seo-routes.json";
import commonRu from "@/locales/ru/common.json";
import docsRu from "@/locales/ru/docs.json";

// ARCHITECT: фоллбэк — реальный прод-домен проекта: canonical/OG/sitemap на мёртвый адрес заставили бы
// поисковик индексировать несуществующий сайт и обесценили весь SEO-контур. Источник правды один.
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://blobus-ai.vercel.app";

export interface SeoRoute {
    readonly path: string;
    readonly title: string;
    readonly description: string;
    readonly priority: number;
    readonly changefreq: string;
}

// ARCHITECT: тип маршрута выведен из JSON, поэтому новое поле в seo-routes.json сразу становится
// частью контракта, а опечатка в имени поля — ошибкой сборки.
export const SEO_ROUTES: readonly SeoRoute[] = seoRoutes;

// ARCHITECT: /about и /changelog живут только в клиентской карте: seo-routes.json читает prerender,
// и маршрут без функции тела уронил бы сборку (scripts/prerender.mjs в этой задаче не трогаем).
// Тексты берутся из ru-словаря common — тех же ключей, что рендерит страница, поэтому заголовок и
// description не расходятся с контентом. Когда у страниц появится пререндер-тело, записи переедут в JSON.
const CLIENT_ROUTES: readonly SeoRoute[] = [
    {
        path: "/about",
        title: commonRu.about.title,
        description: commonRu.about.lead,
        priority: 0.5,
        changefreq: "monthly",
    },
    {
        path: "/changelog",
        title: commonRu.changelog.title,
        description: commonRu.changelog.subtitle,
        priority: 0.5,
        changefreq: "weekly",
    },
    {
        path: "/docs",
        title: docsRu.pageTitle,
        description: docsRu.pageIntro,
        priority: 0.5,
        changefreq: "weekly",
    },
];

const ROUTES_BY_PATH: Readonly<Record<string, SeoRoute>> = Object.fromEntries(
    [...SEO_ROUTES, ...CLIENT_ROUTES].map((route) => [route.path, route])
);

export function findSeoRoute(path: string): SeoRoute | undefined {
    return ROUTES_BY_PATH[normalizeRoutePath(path)];
}

// ARCHITECT: /privacy и /privacy/ — один и тот же документ. Без нормализации canonical и тексты
// зависели бы от хвостового слеша в адресе: маршрут не находился бы, а canonical получал бы лишний
// слеш. Корень («/») остаётся как есть — это отдельный URL со слешем на конце по определению.
export function normalizeRoutePath(path: string): string {
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

// ARCHITECT: canonical, og:url и sitemap требуют абсолютного адреса. Корень отдаётся со слешем на
// конце: «https://site» без него — другой URL для поисковика.
export function absoluteUrl(path: string): string {
    return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
