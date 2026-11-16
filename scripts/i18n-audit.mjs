// ARCHITECT: инвентаризация захардкоженных русских строк: точечные ТЗ по переводу должны опираться
// на цифры, а не на глазомер, поэтому скрипт печатает таблицу файлов и подытоги по группам.
// ARCHITECT: комментарии исключаются из подсчёта: // ARCHITECT: написаны по-русски и иначе дают
// ложное срабатывание в каждом файле.
// ARCHITECT: известное ограничение — // внутри строкового литерала (например https://) обрезает
// остаток строки, поэтому возможен небольшой недосчёт; для инвентаризации это допустимо.
// ARCHITECT: моки src/api/mocks не переводим сознательно (их заменит бэкенд), поэтому папка в списке
// исключений; exit code всегда 0: это аудит, а не гейт.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const EXTENSIONS = [".ts", ".tsx"];
const EXCLUDED = ["/locales/", "/api/mocks/", ".test.", "__tests__"];
const CYRILLIC = /[А-Яа-яЁё]/;
const MAX_ROWS = 40;

const GROUPS = [
    ["pages/dashboard", "src/pages/dashboard/"],
    ["components/dashboard", "src/components/dashboard/"],
    ["components/onboarding", "src/components/onboarding/"],
    ["components/placement", "src/components/placement/"],
    ["pages (прочее)", "src/pages/"],
    ["components (прочее)", "src/components/"],
    ["lib", "src/lib/"],
    ["api", "src/api/"],
    ["прочее", null],
];

function collectFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = join(directory, entry.name);
        if (entry.isDirectory()) return collectFiles(full);

        return EXTENSIONS.some((extension) => entry.name.endsWith(extension)) ? [full] : [];
    });
}

function toPosixPath(fullPath) {
    return relative(ROOT, fullPath).split(sep).join("/");
}

/** Убирает комментарии из строки кода, помня незакрытый блочный комментарий между строками. */
function stripComments(line, state) {
    let code = "";
    let index = 0;

    while (index < line.length) {
        if (state.inBlock) {
            const end = line.indexOf("*/", index);
            if (end === -1) return code;

            state.inBlock = false;
            index = end + 2;
            continue;
        }

        const rest = line.slice(index);
        const lineComment = rest.indexOf("//");
        const blockComment = rest.indexOf("/*");
        const stops = [lineComment, blockComment].filter((at) => at !== -1);
        if (stops.length === 0) return code + rest;

        const cut = Math.min(...stops);
        code += rest.slice(0, cut);
        if (cut !== blockComment) return code;

        state.inBlock = true;
        index += cut + 2;
    }

    return code;
}

function countCyrillicLines(text) {
    const state = { inBlock: false };

    return text
        .split(/\r?\n/)
        .filter((line) => CYRILLIC.test(stripComments(line, state))).length;
}

function groupOf(path) {
    const group = GROUPS.find(([, prefix]) => prefix !== null && path.startsWith(prefix));

    return group === undefined ? "прочее" : group[0];
}

const files = collectFiles(SRC)
    .map(toPosixPath)
    .filter((path) => !EXCLUDED.some((part) => path.includes(part)))
    .map((path) => ({ path, lines: countCyrillicLines(readFileSync(join(ROOT, path), "utf8")) }))
    .filter((file) => file.lines > 0)
    .sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path));

const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
const width = Math.max("файл".length, ...files.map((file) => file.path.length));
const line = (cells) =>
    cells.map((cell, index) => (index === 0 ? cell.padEnd(width) : cell.padStart(18))).join("  ");

console.log("строки с кириллицей вне комментариев\n");
console.log(line(["файл", "строк"]));

for (const file of files.slice(0, MAX_ROWS)) {
    console.log(line([file.path, String(file.lines)]));
}

if (files.length > MAX_ROWS) {
    console.log(`... ещё ${files.length - MAX_ROWS} файлов со строками (см. сортировку по убыванию)`);
}

console.log("\nподытоги по группам:");

for (const [name] of GROUPS) {
    const group = files.filter((file) => groupOf(file.path) === name);
    if (group.length === 0) continue;

    const lines = group.reduce((sum, file) => sum + file.lines, 0);
    console.log(line([name, `${lines} строк, файлов ${group.length}`]));
}

console.log(`\nитого: файлов ${files.length}, строк ${totalLines}`);
