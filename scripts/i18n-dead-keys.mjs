// ARCHITECT: постоянный аудитор мёртвых ключей словарей. Запуск: node scripts/i18n-dead-keys.mjs
// Почему метод именно такой: подстрочный поиск давал ложные «живые» (ключ находился внутри другого
// литерала), split('.') рвал ${a.b} и давал ложные «мёртвые», универсальные шаблоны из одних
// подстановок (${prefix}.${key}) покрывали любой двухсегментный ключ, а тип-шаблоны (actions.${Id})
// не являются вызовами t(). Поэтому: границы ключа, плейсхолдер вместо ${…}, отбрасывание
// универсальных шаблонов и исключение строк объявления типов. Скрипт только читает файлы.
import fs from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const AREAS = ["src", "scripts", "public"];
const EXTRA_FILES = ["index.html", "package.json", "vite.config.ts", "vercel.json", "eslint.config.js", "tsconfig.json"];
const TEXT_EXT = /\.(ts|tsx|js|mjs|json|html)$/;
const LOCALES = join(ROOT, "src", "locales", "ru");

const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : TEXT_EXT.test(full) ? [full] : [];
    });

// ARCHITECT: словари — эталон ключей; сами себя они потребителями не считаются.
const isLocaleFile = (file) => file.includes(`${join("src", "locales")}`);

const sources = [...AREAS.flatMap((area) => (fs.existsSync(area) ? walk(area) : [])), ...EXTRA_FILES.filter((file) => fs.existsSync(file))]
    .filter((file) => !isLocaleFile(file))
    .map((file) => ({ file: file.replaceAll("\\", "/"), text: fs.readFileSync(file, "utf8") }));

const isTypeLine = (line) => /^\s*\|/.test(line) || /^\s*(export\s+)?type\s/.test(line) || /^\s*export\s+interface/.test(line);
const allLines = sources.flatMap(({ text }) => text.split("\n"));
const codeOnly = allLines.filter((line) => !isTypeLine(line)).join("\n");
const typeOnly = allLines.filter(isTypeLine).join("\n");
const blob = sources.map(({ text }) => text).join("\n");

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const consumedByLiteral = (key) => new RegExp(`(?<![\\w.])${escape(key)}(?![\\w.])`).test(blob);

// подстановка ${a.b} заменяется плейсхолдером без точек — иначе split('.') рвёт её на части
const splitTemplate = (template) => template.replace(/\$\{[^}]*\}/g, "§").split(".");
const isUniversal = (template) => splitTemplate(template).every((part) => part === "§");
const templates = [...codeOnly.matchAll(/`([^`\n]*\$\{[^`\n]*)`/g)]
    .map((match) => match[1])
    .filter((template) => !isUniversal(template) && template.includes("."));

const consumedByTemplate = (key) => {
    const segments = key.split(".");
    return templates.some((template) => {
        const parts = splitTemplate(template);
        return parts.length === segments.length && segments.every((segment, index) => parts[index] === "§" || parts[index] === segment);
    });
};

// обходы словаря по группе: Object.values/entries/keys(landing.faq.items) — ключи группы живые
const iterations = [...codeOnly.matchAll(/Object\.(values|entries|keys)\(\s*([\w$.]+)\s*\)/g)].map((match) => match[2]);
const consumedByIteration = (key) => iterations.some((path) => key.startsWith(`${path}.`));

const flatKeys = (value, prefix = "") =>
    Object.entries(value).flatMap(([key, nested]) =>
        nested !== null && typeof nested === "object" ? flatKeys(nested, `${prefix}${key}.`) : [`${prefix}${key}`]
    );

const dead = [];
for (const file of readdirSync(LOCALES).filter((name) => name.endsWith(".json"))) {
    const namespace = file.replace(/\.json$/, "");
    const dictionary = JSON.parse(fs.readFileSync(join(LOCALES, file), "utf8"));
    for (const key of flatKeys(dictionary)) {
        if (consumedByLiteral(key)) continue;
        if (consumedByTemplate(key)) continue;
        if (consumedByIteration(key)) continue;
        if (typeOnly.includes(`"${key}"`)) continue;
        dead.push({ namespace, key });
    }
}

for (const { namespace, key } of dead) console.log(`${namespace}: ${key}`);
console.log(`TOTAL: ${dead.length}`);