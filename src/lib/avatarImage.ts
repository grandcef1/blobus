// ARCHITECT: подготовка картинки аватара на клиенте: cover-кроп 512×512 и перекодирование в JPEG.
// Перекодирование снимает EXIF и даёт компактный base64 без переводов строк; сервер всё равно валидирует
// magic bytes, вес и стороны — клиентский ресайз это UX и приватность, а не защита (§16.2).

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const AVATAR_SIZE = 512;
const JPEG_QUALITY = 0.85;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/** Готовит компактный data URL: cover-кроп по центру, JPEG 512×512. Любой сбой — ошибка без деталей. */
export async function prepareAvatarDataUrl(file: File): Promise<string> {
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("unsupported image type");
    if (file.size > MAX_FILE_BYTES) throw new Error("image is too large");

    const bitmap = await createImageBitmap(file);

    try {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;

        const context = canvas.getContext("2d");

        if (context === null) throw new Error("canvas is not available");

        // ARCHITECT: cover-кроп по центру: масштаб по большей стороне, лишнее уходит за границы кадра.
        const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
        const width = bitmap.width * scale;
        const height = bitmap.height * scale;

        context.drawImage(
            bitmap,
            (AVATAR_SIZE - width) / 2,
            (AVATAR_SIZE - height) / 2,
            width,
            height
        );

        return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    } finally {
        // ARCHITECT: bitmap держит память декодера — освобождаем и на успехе, и на ошибке.
        bitmap.close();
    }
}
