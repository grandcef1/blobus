// ARCHITECT: SEO-контур держится на одном файле seo-routes.json, и ошибка в нём (длинный сниппет,
// мёртвый домен) видна только в выдаче через недели. Тест ловит это в CI.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SEO_ROUTES, SITE_URL, absoluteUrl } from "@/lib/seo";

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

// ARCHITECT: прод-домен проекта. Прежний адрес (blobus.vercel.app) не существует — .env.example прямо
// это фиксирует; если он вернётся в код, canonical, og:url и sitemap будут указывать на мёртвый сайт.
const LIVE_SITE_URL = "https://blobus-ai.vercel.app";
const DEAD_SITE_URL = "blobus.vercel.app";

// ARCHITECT: vitest запускается из корня проекта.
const ROOT = process.cwd();
const SCANNED_PATHS = ["index.html", "public", "scripts", "src", "vercel.json"];
const TEXT_EXTENSIONS = [
    ".css",
    ".html",
    ".js",
    ".json",
    ".mjs",
    ".svg",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
];

function textFilesOf(pathFromRoot: string): string[] {
    const absolute = resolve(ROOT, pathFromRoot);
    if (!statSync(absolute).isDirectory()) return [absolute];

    return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
            ? textFilesOf(relative(ROOT, join(absolute, entry.name)))
            : [join(absolute, entry.name)]
    );
}

function readSource(absolutePath: string): string {
    return readFileSync(absolutePath, "utf8");
}

describe("SEO маршрутов", () => {
    it("title и description укладываются в лимиты поискового сниппета", () => {
        for (const route of SEO_ROUTES) {
            expect(route.title.length, `${route.path}: title`).toBeLessThanOrEqual(TITLE_LIMIT);
            expect(route.description.length, `${route.path}: description`).toBeLessThanOrEqual(
                DESCRIPTION_LIMIT
            );
        }
    });

    it("SITE_URL указывает на живой прод-домен", () => {
        expect(SITE_URL).toBe(LIVE_SITE_URL);
        expect(absoluteUrl("/")).toBe(`${LIVE_SITE_URL}/`);
        // ARCHITECT: дефолт в коде — источник правды для локальных сборок, поэтому сверяем и его, а не
        // только значение, подставленное .env.
        expect(readSource(resolve(ROOT, "src/lib/seo.ts"))).toContain(`"${LIVE_SITE_URL}"`);
        expect(readSource(resolve(ROOT, "scripts/prerender.mjs"))).toContain(`"${LIVE_SITE_URL}"`);
    });

    it("мёртвый домен не встречается в коде и статике", () => {
        const offenders = SCANNED_PATHS.flatMap(textFilesOf)
            .filter((file) => TEXT_EXTENSIONS.some((extension) => file.endsWith(extension)))
            // ARCHITECT: сами тесты вне проверки: этот файл держит мёртвый домен как константу — иначе
            // он находил бы сам себя.
            .filter((file) => !relative(ROOT, file).replace(/\\/g, "/").startsWith("src/test/"))
            .filter((file) => readSource(file).includes(DEAD_SITE_URL))
            .map((file) => relative(ROOT, file));

        expect(offenders).toEqual([]);
    });
});
