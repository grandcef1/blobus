// ARCHITECT: валидатор картинки — чистая функция, поэтому фикстуры собираются программно: PNG-сигнатура и
// IHDR с нужными сторонами, JPEG SOI + SOF0. Настоящие изображения здесь не нужны — проверяются правила.

import { describe, expect, it } from "vitest";

import { ImageError, decodeAvatarDataUrl } from "./image.ts";

function u32(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(value, 0);

    return buffer;
}

function u16(value: number): Buffer {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(value, 0);

    return buffer;
}

function chunk(type: string, data: Buffer): Buffer {
    return Buffer.concat([u32(data.length), Buffer.from(type, "ascii"), data, Buffer.alloc(4)]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PNG нужных сторон: сигнатура, IHDR и IDAT-набивка заданного веса. */
function pngDataUrl(width: number, height: number, paddingBytes = 32): string {
    const header = chunk(
        "IHDR",
        Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])
    );
    const data = chunk("IDAT", Buffer.alloc(paddingBytes, 0x42));
    const png = Buffer.concat([PNG_SIGNATURE, header, data]);

    return `data:image/png;base64,${png.toString("base64")}`;
}

function segment(marker: number, payload: Buffer): Buffer {
    return Buffer.concat([Buffer.from([0xff, marker]), u16(payload.length + 2), payload]);
}

/** JPEG нужных сторон: SOI, COM-набивка, SOF0 с размерами, SOS и EOI. */
function jpegDataUrl(width: number, height: number, paddingBytes = 32): string {
    const comment = segment(0xfe, Buffer.alloc(paddingBytes, 0x43));
    const sof0 = segment(
        0xc0,
        Buffer.concat([
            Buffer.from([8]),
            u16(height),
            u16(width),
            Buffer.from([3]),
            Buffer.from([1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1]),
        ])
    );
    const sos = segment(0xda, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0]));
    const jpeg = Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        comment,
        sof0,
        sos,
        Buffer.from([0xff, 0xd9]),
    ]);

    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

describe("decodeAvatarDataUrl", () => {
    it("3.1 валидный PNG 64x64: mime, ext и стороны из IHDR", () => {
        const image = decodeAvatarDataUrl(pngDataUrl(64, 64));

        expect(image.mime).toBe("image/png");
        expect(image.ext).toBe("png");
        expect(image.width).toBe(64);
        expect(image.height).toBe(64);
        expect(image.buffer.length).toBeGreaterThanOrEqual(64);
    });

    it("3.2 валидный JPEG 512x512: стороны из SOF0", () => {
        const image = decodeAvatarDataUrl(jpegDataUrl(512, 512));

        expect(image.mime).toBe("image/jpeg");
        expect(image.ext).toBe("jpg");
        expect(image.width).toBe(512);
        expect(image.height).toBe(512);
    });

    it("3.3 mime image/webp не поддерживается", () => {
        expect(() =>
            decodeAvatarDataUrl(pngDataUrl(64, 64).replace("image/png", "image/webp"))
        ).toThrow(ImageError);
    });

    it("3.4 заявлен PNG, содержимое JPEG — магия не совпадает", () => {
        const jpegPayload = jpegDataUrl(128, 128).slice("data:image/jpeg;base64,".length);

        expect(() => decodeAvatarDataUrl(`data:image/png;base64,${jpegPayload}`)).toThrow(
            ImageError
        );
    });

    it("3.5 data URL длиннее 350000 символов", () => {
        const long = `data:image/png;base64,${"A".repeat(350_000)}`;

        expect(() => decodeAvatarDataUrl(long)).toThrow(ImageError);
    });

    it("3.6 декодированный буфер меньше 64 байт", () => {
        const tiny = Buffer.concat([
            PNG_SIGNATURE,
            chunk("IHDR", Buffer.concat([u32(64), u32(64), Buffer.from([8, 6, 0, 0, 0])])),
        ]);

        expect(tiny.length).toBeLessThan(64);
        expect(() =>
            decodeAvatarDataUrl(`data:image/png;base64,${tiny.toString("base64")}`)
        ).toThrow(ImageError);
    });

    it("3.7 декодированный буфер больше 262144 байт", () => {
        expect(() => decodeAvatarDataUrl(pngDataUrl(64, 64, 262_144))).toThrow(ImageError);
    });

    it("3.8 PNG 32x32 меньше минимума по стороне", () => {
        expect(() => decodeAvatarDataUrl(pngDataUrl(32, 32))).toThrow(ImageError);
    });

    it("3.9 PNG 5000x5000 больше максимума по стороне", () => {
        expect(() => decodeAvatarDataUrl(pngDataUrl(5000, 5000))).toThrow(ImageError);
    });

    it("3.10 не-base64 и отсутствующий префикс data:", () => {
        expect(() => decodeAvatarDataUrl("hello")).toThrow(ImageError);
        expect(() => decodeAvatarDataUrl("data:image/png;base64,@@not-base64@@")).toThrow(
            ImageError
        );
        expect(() => decodeAvatarDataUrl("data:text/plain;base64,AAAA")).toThrow(ImageError);
    });

    it("3.11 JPEG без SOF не разбирается", () => {
        const truncated = Buffer.concat([
            Buffer.from([0xff, 0xd8]),
            segment(0xfe, Buffer.alloc(64, 0x43)),
            Buffer.from([0xff, 0xd9]),
        ]);

        expect(() =>
            decodeAvatarDataUrl(`data:image/jpeg;base64,${truncated.toString("base64")}`)
        ).toThrow(ImageError);
    });
});
