// ARCHITECT: og-image.png собирается разово скриптом `npm run og`, а не на каждом build: sharp нужен
// только здесь, поэтому сборка от него не зависит, а PNG лежит в репозитории (public/og-image.png).
// ARCHITECT: соцсети не принимают SVG как og:image, поэтому источник — SVG, результат — PNG 1200x630.

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "public", "og-image.png");
const WIDTH = 1200;
const HEIGHT = 630;

// ARCHITECT: знак — тонкий монохромный контур блобатара (те же пропорции, что у BRAND_TRAITS:
// вытянутая форма, два глаза). Толщина линии 2px: знак декоративный, вордмарк — главный.
const BLOB_MARK = `
  <g fill="none" stroke="#f0f0f5" stroke-width="2" opacity="0.8">
    <path d="M58 4 C 96 2 118 30 114 62 C 110 96 88 118 56 116 C 22 114 2 88 6 54 C 10 22 26 6 58 4 Z" />
  </g>
  <g fill="#f0f0f5">
    <circle cx="44" cy="54" r="3.5" />
    <circle cx="76" cy="54" r="3.5" />
  </g>`;

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#000000" />
  <g transform="translate(120 245) scale(1.1)">${BLOB_MARK}</g>
  <text x="272" y="300" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="600" letter-spacing="-3" fill="#f0f0f5">Blobus</text>
  <text x="276" y="356" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#f0f0f5" fill-opacity="0.6">ИИ-репетитор английского</text>
</svg>`;

await mkdir(dirname(OUTPUT), { recursive: true });

const info = await sharp(Buffer.from(SVG)).png().toFile(OUTPUT);

if (info.width !== WIDTH || info.height !== HEIGHT) {
    throw new Error(`og: ожидался ${WIDTH}x${HEIGHT}, получено ${info.width}x${info.height}`);
}

// ARCHITECT: самопроверка «картинка не пустая»: если шрифт не найден, SVG отрендерится почти чёрным,
// и og:image уедет в прод пустым. Проверяем, что на холсте есть светлые пиксели.
const stats = await sharp(OUTPUT).stats();
const lightestChannel = Math.max(...stats.channels.map((channel) => channel.max));

if (lightestChannel < 200) {
    throw new Error("og: картинка почти пустая — проверь шрифты и SVG");
}

console.log(`og: ${OUTPUT} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} КБ)`);
