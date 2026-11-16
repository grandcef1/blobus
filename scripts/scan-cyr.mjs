// Временный сканер: печатает строки с кириллицей вне комментариев для указанных папок/файлов.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const targets = process.argv.slice(2);
const files = [];

const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full.replace(/\\/g, "/"));
    }
};

for (const target of targets) {
    if (statSync(target).isDirectory()) walk(target);
    else files.push(target.replace(/\\/g, "/"));
}

const out = [];
for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
        if (!/[\u0400-\u04FF]/.test(line)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        out.push(`${file}:${index + 1}: ${line.trim()}`);
    });
}
console.log(out.join("\n"));
console.log(`TOTAL=${out.length}`);
