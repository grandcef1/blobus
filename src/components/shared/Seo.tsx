// ARCHITECT: метаданные страницы без библиотек: React 19 сам поднимает <title>, <meta> и <link> из
// тела компонента в <head>, поэтому react-helmet в CSR-приложении не нужен.
// ARCHITECT: заголовок и description приходят из seo-routes.json по path (title/description можно
// переопределить пропсами) — те же строки попадают в статический HTML prerender'а, и клиент не
// переписывает их переводом из словаря.
// ARCHITECT: canonical выводится только у индексируемых маршрутов: на noindex-страницах (вход,
// восстановление пароля, приватные разделы, soft-404) он не несёт смысла, а «canonical = /» на
// /app/* указывал бы поисковику на чужой URL.

import { useEffect } from "react";
import { formatDocumentTitle } from "@/hooks/useDocumentTitle";
import { SITE_URL, absoluteUrl, findSeoRoute, normalizeRoutePath } from "@/lib/seo";

const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
const OG_IMAGE_ALT = "Blobus — ИИ-репетитор английского";
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

interface SeoProps {
    /** Заголовок вкладки. Не задан — берётся из seo-routes.json по path. */
    readonly title?: string;
    readonly description?: string;
    /** Путь маршрута, по которому Seo находит тексты и строит canonical. */
    readonly path?: string;
    /** false — страница закрыта от индексации (robots: noindex,follow). */
    readonly indexable?: boolean;
    readonly jsonLd?: object;
}

export function Seo({ title, description, path, indexable = true, jsonLd }: SeoProps) {
    // ARCHITECT: путь нормализуется до формы без хвостового слеша: /privacy и /privacy/ — один
    // документ, и canonical у них должен быть один.
    const routePath = path === undefined ? undefined : normalizeRoutePath(path);
    const route = routePath === undefined ? undefined : findSeoRoute(routePath);
    const resolvedTitle = title ?? route?.title;
    const resolvedDescription = description ?? route?.description;
    const url = routePath === undefined ? undefined : absoluteUrl(routePath);

    // ARCHITECT: prerender-теги помечены data-seo="static"; убираем, чтобы React-19-hoisting не
    // задвоил title/meta. Повторный запуск эффекта (StrictMode) безопасен: удалять уже нечего.
    useEffect(() => {
        document.head.querySelectorAll('[data-seo="static"]').forEach((tag) => tag.remove());
    }, []);

    return (
        <>
            {resolvedTitle !== undefined && <title>{formatDocumentTitle(resolvedTitle)}</title>}
            {resolvedDescription !== undefined && (
                <meta name="description" content={resolvedDescription} />
            )}
            <meta name="robots" content={indexable ? "index,follow" : "noindex,follow"} />
            {indexable && url !== undefined && <link rel="canonical" href={url} />}
            {url !== undefined && <meta property="og:url" content={url} />}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Blobus" />
            <meta property="og:locale" content="ru_RU" />
            <meta property="og:image" content={OG_IMAGE_URL} />
            <meta property="og:image:width" content={OG_IMAGE_WIDTH} />
            <meta property="og:image:height" content={OG_IMAGE_HEIGHT} />
            <meta property="og:image:alt" content={OG_IMAGE_ALT} />
            {resolvedTitle !== undefined && <meta property="og:title" content={resolvedTitle} />}
            {resolvedDescription !== undefined && (
                <meta property="og:description" content={resolvedDescription} />
            )}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:image" content={OG_IMAGE_URL} />
            {/* ARCHITECT: JSON-LD остаётся в теле компонента: Google читает разметку и из body, а
                инлайновый script через текст-потомка не требует dangerouslySetInnerHTML. */}
            {jsonLd !== undefined && (
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            )}
        </>
    );
}
