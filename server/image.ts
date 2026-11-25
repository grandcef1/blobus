// ARCHITECT: разбор и проверка картинки аватара — чистый модуль без сети и без Express. Формат определяется
// содержимым (magic bytes), а не расширением или заявленным MIME; размеры читаются из заголовков, чтобы
// отсечь decompression bomb и гигантские полотна до записи в storage (§16.10).

export interface DecodedImage {
    buffer: Buffer;
    mime: "image/jpeg" | "image/png";
    ext: "jpg" | "png";
    width: number;
    height: number;
}

/** Ошибка валидации картинки: наружу уходит только 400 без деталей (§16.4). */
export class ImageError extends Error {}

const DATA_URL_PATTERN = /^data:(image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_DATA_URL_LENGTH = 350_000;
const MIN_BYTES = 64;
const MAX_BYTES = 262_144;
const MIN_SIDE = 64;
const MAX_SIDE = 2048;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ARCHITECT: IHDR идёт первым чанком сразу после 8-байтной сигнатуры: длина (4), тип (4), затем width и
// height по 4 байта big-endian — читаем их по фиксированным смещениям.
function pngSize(buffer: Buffer): { readonly width: number; readonly height: number } {
    if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") {
        throw new ImageError("png header is not IHDR");
    }

    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// ARCHITECT: идём по маркерам до SOF0/SOF1/SOF2: длина сегмента включает два байта самой длины, а
// standalone-маркеры (RST) длины не имеют. SOS/EOI до SOF означает, что размеров в файле нет.
function jpegSize(buffer: Buffer): { readonly width: number; readonly height: number } {
    let offset = 2;

    while (offset + 4 <= buffer.length) {
        if (buffer[offset] !== 0xff) throw new ImageError("jpeg marker expected");

        const marker = buffer[offset + 1];

        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2;
            continue;
        }

        if (marker === 0xd9 || marker === 0xda) break;

        const length = buffer.readUInt16BE(offset + 2);

        if (length < 2) throw new ImageError("jpeg segment length is invalid");

        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
            if (offset + 9 > buffer.length) throw new ImageError("jpeg SOF is truncated");

            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }

        offset += 2 + length;
    }

    throw new ImageError("jpeg size is not found");
}

function signatureMatches(mime: DecodedImage["mime"], buffer: Buffer): boolean {
    if (mime === "image/png") {
        return (
            buffer.length >= PNG_SIGNATURE.length &&
            PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
        );
    }

    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/**
 * Разбирает data URL аватара и проверяет формат, вес и стороны. Любой провал — ImageError без деталей.
 */
export function decodeAvatarDataUrl(input: string): DecodedImage {
    if (input.length > MAX_DATA_URL_LENGTH) throw new ImageError("data url is too long");

    const match = DATA_URL_PATTERN.exec(input);

    if (match === null) throw new ImageError("unsupported data url");

    const mime = match[1] === "image/png" ? "image/png" : "image/jpeg";
    const buffer = Buffer.from(match[2], "base64");

    if (buffer.length < MIN_BYTES || buffer.length > MAX_BYTES) {
        throw new ImageError("image size is out of range");
    }

    // ARCHITECT: заявленный MIME обязан совпасть с магией файла: иначе клиент подсунул бы любой файл под
    // видом картинки.
    if (!signatureMatches(mime, buffer)) throw new ImageError("image signature mismatch");

    const size = mime === "image/png" ? pngSize(buffer) : jpegSize(buffer);

    if (
        size.width < MIN_SIDE ||
        size.width > MAX_SIDE ||
        size.height < MIN_SIDE ||
        size.height > MAX_SIDE
    ) {
        throw new ImageError("image dimensions are out of range");
    }

    return { buffer, mime, ext: mime === "image/png" ? "png" : "jpg", ...size };
}
