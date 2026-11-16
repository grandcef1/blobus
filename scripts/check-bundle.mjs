// ARCHITECT: project-rules требует контроля веса initial load (лимит — 500 kb). Скрипт читает
// dist/index.html и берёт только начальный граф: script src и modulepreload href. Ленивые чанки
// (Sentry, страницы панели) в него не входят, поэтому бюджет не растёт вместе с ними.
// ARCHITECT: бюджет считается по gzip — столько браузер качает по сети (Vercel отдаёт br, gzip даёт
// консервативную оценку). Raw-сумма печатается рядом: у текущего приложения она 1002 kB, потому что
// React, роутер, i18n и framer-motion лежат в начальном графе — по raw лимит 500 kB не проходит ни одна
// рабочая конфигурация. Рост raw без роста gzip — это комментарии и имена, рост обоих — новая
// зависимость в начальном графе.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = resolve(process.cwd(), "dist");
const INDEX_HTML = join(DIST, "index.html");
const LIMIT_BYTES = 500 * 1024;

const SCRIPT_SRC_PATTERN = /<script\b[^>]*\bsrc="([^"]+)"/g;
const LINK_TAG_PATTERN = /<link\b[^>]*>/g;
const HREF_PATTERN = /href="([^"]+)"/;

/** Адреса из modulepreload: порядок атрибутов в теге не фиксирован, поэтому тег разбирается целиком. */
function modulePreloadHrefs(html) {
    return [...html.matchAll(LINK_TAG_PATTERN)]
        .map((match) => match[0])
        .filter((tag) => tag.includes('rel="modulepreload"'))
        .map((tag) => HREF_PATTERN.exec(tag)?.[1])
        .filter((href) => href !== undefined);
}

function initialScripts(html) {
    const hrefs = [
        ...[...html.matchAll(SCRIPT_SRC_PATTERN)].map((match) => match[1]),
        ...modulePreloadHrefs(html),
    ];

    return [...new Set(hrefs)]
        .filter((href) => href.endsWith(".js"))
        .map((href) => {
            const file = join(DIST, href.replace(/^\/+/, ""));
            if (!existsSync(file)) {
                throw new Error(
                    `check-bundle: в dist нет файла ${href} — dist собран из другого кода`
                );
            }
            const contents = readFileSync(file);
            return { href, raw: contents.length, gzip: gzipSync(contents).length };
        });
}

const kB = (bytes) => (bytes / 1024).toFixed(1);

function printTable(assets, totalRaw, totalGzip) {
    const rows = assets.map(({ href, raw, gzip }) => [href, `${kB(raw)} kB`, `${kB(gzip)} kB`]);
    const width = Math.max("файл".length, ...rows.map(([href]) => href.length));
    const line = (cells) =>
        cells
            .map((cell, index) => (index === 0 ? cell.padEnd(width) : cell.padStart(11)))
            .join("  ");

    console.log(
        [
            line(["файл", "raw", "gzip"]),
            ...rows.map(line),
            line(["итого", `${kB(totalRaw)} kB`, `${kB(totalGzip)} kB`]),
            line(["лимит по gzip", "", `${kB(LIMIT_BYTES)} kB`]),
        ].join("\n")
    );
}

if (!existsSync(INDEX_HTML)) {
    console.error("check-bundle: dist/index.html не найден — сначала выполните npm run build");
    process.exit(1);
}

const assets = initialScripts(readFileSync(INDEX_HTML, "utf8"));
const totalRaw = assets.reduce((sum, asset) => sum + asset.raw, 0);
const totalGzip = assets.reduce((sum, asset) => sum + asset.gzip, 0);

printTable(assets, totalRaw, totalGzip);

if (totalGzip > LIMIT_BYTES) {
    console.error(
        `check-bundle: initial JS ${kB(totalGzip)} kB gzip превышает лимит ${kB(LIMIT_BYTES)} kB`
    );
    process.exit(1);
}
