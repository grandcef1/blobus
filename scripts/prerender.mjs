// ARCHITECT: prerender без SSR React-дерева. Сайт — CSR SPA на Vercel, а shaders, i18n-детектор и
// zustand-persist небезопасны в Node, поэтому React в Node не рендерится: post-build скрипт вставляет
// в статические HTML per-route <head> и осмысленный crawlable-контент в #root, а React (createRoot)
// при загрузке заменяет содержимое контейнера.
// ARCHITECT: Vercel отдаёт файлы из filesystem до rewrites, поэтому dist/privacy/index.html
// побеждает SPA-fallback на /index.html.
// ARCHITECT: тексты читаются из тех же файлов, что бандлит приложение (src/locales/ru, src/lib/legal.ts,
// src/lib/seo-routes.json): заглушек и Lorem здесь нет, а статический HTML не может разойтись с UI.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
// ARCHITECT: тот же фоллбэк, что и в src/lib/seo.ts: prerender пишет canonical, sitemap и robots,
// и расхождение с клиентом дало бы два разных домена в одном сайте.
const SITE_URL = process.env.VITE_SITE_URL ?? "https://blobus-ai.vercel.app";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SCHEMA_CONTEXT = "https://schema.org";
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

// ARCHITECT: приватные маршруты закрыты в robots.txt — они не входят в sitemap и живут только в SPA.
const DISALLOWED_PATHS = [
    "/app/",
    "/onboarding",
    "/listening",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
];

const readText = (relativePath) => readFile(join(ROOT, relativePath), "utf8");
const readJson = async (relativePath) => JSON.parse(await readText(relativePath));

const escapeHtml = (value) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

const paragraphs = (text) => text.split("\n\n").map((part) => `<p>${escapeHtml(part)}</p>`).join("");

const absoluteUrl = (path) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`);

const routes = await readJson("src/lib/seo-routes.json");
const landing = await readJson("src/locales/ru/landing.json");
const legal = await readJson("src/locales/ru/legal.json");
const common = await readJson("src/locales/ru/common.json");
const docs = await readJson("src/locales/ru/docs.json");
const legalSource = await readText("src/lib/legal.ts");

// ARCHITECT: имя оператора берётся из ru-словаря common — тот же источник, что у самой страницы
// в рантайме, поэтому копии не появляется; email не переводится и остаётся константой legal.ts.
const readConst = (name) => {
    const match = new RegExp(`export const ${name} = "([^"]+)"`).exec(legalSource);
    if (match === null) throw new Error(`prerender: в src/lib/legal.ts не найдена константа ${name}`);
    return match[1];
};

const withVars = (text) =>
    text
        .replaceAll("{{operator}}", common.legal.operator)
        .replaceAll("{{email}}", readConst("OPERATOR_CONTACT_EMAIL"));

const landingHtml = () => {
    const features = Object.values(landing.features.cards)
        .map((card) => `<li><strong>${escapeHtml(card.title)}</strong>: ${escapeHtml(card.description)}</li>`)
        .join("");
    const steps = Object.values(landing.howItWorks.steps)
        .map((step) => `<h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p>`)
        .join("");
    const plans = Object.values(landing.pricing.plans)
        .map(
            (plan) =>
                `<li><h3>${escapeHtml(plan.name)}</h3><p>${escapeHtml(plan.description)}</p><p>${escapeHtml(plan.cta)}</p></li>`
        )
        .join("");
    const faq = Object.values(landing.faq.items)
        .map((item) => `<h3>${escapeHtml(item.question)}</h3>${paragraphs(item.full)}`)
        .join("");
    const legalLinks = ["privacy", "terms", "cookies"]
        .map((id) => `<a href="/${id}">${escapeHtml(legal.legal.layout.nav[id])}</a>`)
        .join(" · ");

    return `<main>
<h1>${escapeHtml(`${landing.hero.titleLine1} ${landing.hero.titleLine2}`)}</h1>
<p>${escapeHtml(landing.hero.subtitle)}</p>
<ul>${Object.values(landing.hero.benefits).map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}</ul>
<h2>${escapeHtml(landing.features.title)}</h2>
<p>${escapeHtml(landing.features.subtitle)}</p>
<ul>${features}</ul>
<h2>${escapeHtml(landing.howItWorks.title)}</h2>
<p>${escapeHtml(landing.howItWorks.subtitle)}</p>
${steps}
<h2>${escapeHtml(landing.pricing.title)}</h2>
<p>${escapeHtml(landing.pricing.subtitle)}</p>
<ul>${plans}</ul>
<h2>${escapeHtml(landing.faq.title)}</h2>
<p>${escapeHtml(landing.faq.subtitle)}</p>
${faq}
<nav><a href="/help">${escapeHtml(landing.faq.support.cta)}</a> · ${legalLinks}</nav>
</main>`;
};

// shortcut: таблицы правовых страниц (обработчики данных, хранилище) в prerender не дублируются —
// текста разделов достаточно для индексирования, а состав таблиц живёт в src/lib/legal.ts и словарях.
const legalHtml = (pageId) => {
    const page = legal.legal[pageId];
    const sections = Object.values(page.sections)
        .map((section) => `<h2>${escapeHtml(section.title)}</h2>${paragraphs(withVars(section.body))}`)
        .join("");

    return `<article>
<h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.intro)}</p>
${sections}
</article>`;
};

// ARCHITECT: FAQ центра помощи — из src/api/mocks/help.ts: в словарях его нет, а вопрос и ответ лежат
// там литералами. Guard ниже падает, если формат файла изменится: лучше громкая ошибка сборки, чем
// пустой <article> в проде.
const HELP_FAQ_PATTERN = /question: "((?:[^"\\]|\\.)*)",\s*answer: "((?:[^"\\]|\\.)*)",/g;
const helpFaq = [...(await readText("src/api/mocks/help.ts")).matchAll(HELP_FAQ_PATTERN)].map((match) => ({
    question: JSON.parse(`"${match[1]}"`),
    answer: JSON.parse(`"${match[2]}"`),
}));

if (helpFaq.length === 0) {
    throw new Error("prerender: не удалось прочитать FAQ из src/api/mocks/help.ts");
}

// ARCHITECT: h1 совпадает с заголовком HelpCenter: статический HTML и React-страница называют раздел
// одинаково.
const helpHtml = (route) => `
<article>
<h1>Центр помощи</h1>
<p>${escapeHtml(route.description)}</p>
<h2>${escapeHtml(landing.faq.title)}</h2>
${helpFaq.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join("")}
</article>`;

// ARCHITECT: контакты собираются из common.json и того же адреса поддержки, что и сама страница:
// статический HTML не может разойтись с React-экраном.
const contactsHtml = () => {
    const contacts = common.contacts;
    const email = readConst("OPERATOR_CONTACT_EMAIL");

    return `<article>
<h1>${escapeHtml(contacts.title)}</h1>
<p>${escapeHtml(contacts.lead)}</p>
<h2>${escapeHtml(contacts.emailLabel)}</h2>
<p>${escapeHtml(contacts.emailHint)} <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<h2>${escapeHtml(contacts.help.title)}</h2>
<p>${escapeHtml(contacts.help.body)} <a href="/help">${escapeHtml(contacts.help.link)}</a></p>
<h2>${escapeHtml(contacts.privacy.title)}</h2>
<p>${escapeHtml(contacts.privacy.body)} <a href="/privacy">${escapeHtml(contacts.privacy.link)}</a></p>
</article>`;
};

// ARCHITECT: тексты /about и /changelog лежат в common.json — тех же ключах, что рендерят страницы,
// поэтому статический HTML и React-версия не могут разойтись по формулировкам.
const aboutHtml = () => `<main><article>
<h1>${escapeHtml(common.about.title)}</h1>
<p>${escapeHtml(common.about.lead)}</p>
<h2>${escapeHtml(common.about.whyTitle)}</h2>
<p>${escapeHtml(common.about.whyBody)}</p>
<h2>${escapeHtml(common.about.howTitle)}</h2>
<p>${escapeHtml(common.about.howBody)}</p>
<p>${escapeHtml(common.about.note)}</p>
</article></main>`;

const CHANGELOG_LAUNCH_DATE = "2026-11-18";

const changelogHtml = () => {
    // ARCHITECT: дата форматируется тем же Intl с локалью ru, что и на клиенте, поэтому строка совпадает;
    // суффикс T00:00:00 держит сутки на месте в любом часовом поясе сборки.
    const date = new Intl.DateTimeFormat("ru", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${CHANGELOG_LAUNCH_DATE}T00:00:00`));
    const post = common.changelog.launch;

    return `<main><article>
<h1>${escapeHtml(common.changelog.title)}</h1>
<p>${escapeHtml(common.changelog.subtitle)}</p>
<article>
<p><span>${escapeHtml(post.tag)}</span> <time datetime="${CHANGELOG_LAUNCH_DATE}">${escapeHtml(date)}</time></p>
<h2>${escapeHtml(post.title)}</h2>
<p>${escapeHtml(post.body)}</p>
</article>
</article></main>`;
};

// ARCHITECT: состав и порядок разделов документации читаются из src/pages/docs/docsSections.ts — того же
// модуля, что рендерит страница, поэтому статический HTML не разойдётся с UI при добавлении подраздела.
// Приём тот же, что с FAQ центра помощи: guard ниже роняет сборку, если формат файла изменится.
const docsSource = await readText("src/pages/docs/docsSections.ts");
const pickGroup = (pattern, block) => {
    const match = pattern.exec(block);
    return match === null ? undefined : match[1];
};

const docsSections = docsSource
    .split(/^ {8}id: "/m)
    .slice(1)
    .map((block) => ({
        id: pickGroup(/^([a-zA-Z]+)"/, block),
        titleKey: pickGroup(/titleKey: "([^"]+)"/, block),
        introKey: pickGroup(/introKey: "([^"]+)"/, block),
        items: [...block.matchAll(/titleKey: "([^"]+)", bodyKey: "([^"]+)"/g)].map((match) => [
            match[1],
            match[2],
        ]),
        helpLinkKey: pickGroup(/helpLinkKey: "([^"]+)"/, block),
    }));

if (docsSections.length !== 7 || docsSections.some((section) => section.items.length === 0)) {
    throw new Error("prerender: не удалось прочитать разделы из src/pages/docs/docsSections.ts");
}

// ARCHITECT: ключи в docsSections.ts идут без префикса неймспейса — резолвим их в docs.json тем же путём,
// что и компонент; отсутствие ключа — громкая ошибка сборки, а не пустой абзац в проде.
const docsValue = (key) => {
    const value = key.split(".").reduce((node, part) => (node === undefined ? undefined : node[part]), docs);
    if (typeof value !== "string") throw new Error(`prerender: в docs.json нет ключа ${key}`);
    return value;
};

const docsHtml = () => {
    const sections = docsSections
        .map((section) => {
            const items = section.items
                .map(
                    ([titleKey, bodyKey]) =>
                        `<h3>${escapeHtml(docsValue(titleKey))}</h3><p>${escapeHtml(docsValue(bodyKey))}</p>`
                )
                .join("");
            const help =
                section.helpLinkKey === undefined
                    ? ""
                    : `<p><a href="/help">${escapeHtml(docsValue(section.helpLinkKey))}</a></p>`;

            return `<section id="${section.id}"><h2>${escapeHtml(docsValue(section.titleKey))}</h2><p>${escapeHtml(docsValue(section.introKey))}</p>${items}${help}</section>`;
        })
        .join("");

    return `<main><article>
<h1>${escapeHtml(docs.pageTitle)}</h1>
<p>${escapeHtml(docs.pageIntro)}</p>
${sections}
</article></main>`;
};

const BODIES = {
    "/": landingHtml,
    "/help": helpHtml,
    "/contacts": contactsHtml,
    "/privacy": () => legalHtml("privacy"),
    "/terms": () => legalHtml("terms"),
    "/cookies": () => legalHtml("cookies"),
    "/about": aboutHtml,
    "/changelog": changelogHtml,
    "/docs": docsHtml,
};

const ORGANIZATION = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: "Blobus",
    url: SITE_URL,
    logo: `${SITE_URL}/blobatar-icon.png`,
    contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: readConst("OPERATOR_CONTACT_EMAIL"),
        availableLanguage: ["ru", "en", "es"],
    },
};

const WEBSITE = { "@context": SCHEMA_CONTEXT, "@type": "WebSite", name: "Blobus", url: SITE_URL, inLanguage: "ru" };

const SOFTWARE_APPLICATION = {
    "@context": SCHEMA_CONTEXT,
    "@type": "SoftwareApplication",
    name: "Blobus",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const HOME_FAQ = {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: Object.values(landing.faq.items).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.full },
    })),
};

// ARCHITECT: форма разметки совпадает с клиентской (src/lib/structured-data.ts): на главной — узел
// с @graph, на остальных — BreadcrumbList. Один вид разметки вместо двух.
const jsonLdFor = (route) =>
    route.path === "/"
        ? { "@context": SCHEMA_CONTEXT, "@graph": [ORGANIZATION, WEBSITE, SOFTWARE_APPLICATION, HOME_FAQ] }
        : [
              {
                  "@context": SCHEMA_CONTEXT,
                  "@type": "BreadcrumbList",
                  itemListElement: [
                      { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
                      { "@type": "ListItem", position: 2, name: route.title, item: absoluteUrl(route.path) },
                  ],
              },
          ];

const metaTag = (attributes) => `<meta data-seo="static" ${attributes} />`;

const headTags = (route, jsonLd) => {
    const url = absoluteUrl(route.path);
    const title = escapeHtml(route.title);
    const description = escapeHtml(route.description);

    return [
        `<title data-seo="static">${title}</title>`,
        metaTag(`name="description" content="${description}"`),
        metaTag('name="robots" content="index,follow"'),
        `<link data-seo="static" rel="canonical" href="${url}" />`,
        metaTag('property="og:type" content="website"'),
        metaTag('property="og:site_name" content="Blobus"'),
        metaTag('property="og:locale" content="ru_RU"'),
        metaTag(`property="og:url" content="${url}"`),
        metaTag(`property="og:title" content="${title}"`),
        metaTag(`property="og:description" content="${description}"`),
        metaTag(`property="og:image" content="${OG_IMAGE_URL}"`),
        metaTag('property="og:image:width" content="1200"'),
        metaTag('property="og:image:height" content="630"'),
        metaTag('name="twitter:card" content="summary_large_image"'),
        metaTag(`name="twitter:image" content="${OG_IMAGE_URL}"`),
        `<script data-seo="static" type="application/ld+json">${jsonLd}</script>`,
    ].join("\n        ");
};

const ROOT_CONTAINER = '<div id="root"></div>';
const template = await readText("dist/index.html");

if (!template.includes(ROOT_CONTAINER)) {
    throw new Error("prerender: в dist/index.html нет пустого #root — проверь index.html");
}

// ARCHITECT: title и description шаблона снимаются до вставки: иначе в HTML оказались бы два
// заголовка — от Vite-шаблона и от маршрута.
const stripped = template
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta name="description"[^>]*>\s*/i, "");

for (const route of routes) {
    const buildBody = BODIES[route.path];
    if (buildBody === undefined) throw new Error(`prerender: для маршрута ${route.path} нет контента`);
    // ARCHITECT: JSON-LD проходит через JSON.parse до вставки — невалидный JSON не уедет в HTML.
    const jsonLd = JSON.stringify(JSON.parse(JSON.stringify(jsonLdFor(route)))).replaceAll("<", "\\u003c");
    const html = stripped
        .replace("</head>", `${headTags(route, jsonLd)}\n    </head>`)
        .replace(ROOT_CONTAINER, `<div id="root">${buildBody(route)}</div>`);
    const file = route.path === "/" ? join(DIST, "index.html") : join(DIST, route.path.slice(1), "index.html");

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, "utf8");
    console.log(`prerender: ${route.path} -> ${relative(DIST, file).replaceAll("\\", "/")}`);
}

const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
].join("\n");

const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((route) =>
        [
            "  <url>",
            `    <loc>${absoluteUrl(route.path)}</loc>`,
            `    <lastmod>${BUILD_DATE}</lastmod>`,
            `    <changefreq>${route.changefreq}</changefreq>`,
            `    <priority>${route.priority.toFixed(1)}</priority>`,
            "  </url>",
        ].join("\n")
    ),
    "</urlset>",
    "",
].join("\n");

await writeFile(join(DIST, "robots.txt"), robotsTxt, "utf8");
await writeFile(join(DIST, "sitemap.xml"), sitemapXml, "utf8");
console.log(`prerender: robots.txt и sitemap.xml готовы (${routes.length} URL)`);

