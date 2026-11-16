// Временный сканер: печатает строки с кириллицей вне комментариев для файлов из argv.
import { readFileSync } from "node:fs";

for (const file of process.argv.slice(2)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    const hits = [];
    lines.forEach((line, index) => {
        if (!/[\u0400-\u04FF]/.test(line)) return;
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        hits.push(`${index + 1}: ${line}`);
    });
    if (hits.length === 0) continue;
    console.log(`===== ${file} =====`);
    console.log(hits.join("\n"));
}
