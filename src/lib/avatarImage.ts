// ARCHITECT: клиентская подготовка аватара: декодирование выбранного файла и кроп по выбранной рамке.
// Canvas снимает EXIF и даёт компактный base64 без переводов строк; сервер всё равно валидирует magic bytes,
// вес и стороны — клиентский ресайз это UX и приватность, а не защита (§16.2).

const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** Целевая сторона готового аватара: столько ждёт серверная схема. */
const AVATAR_SIZE = 512;
const JPEG_QUALITY = 0.85;
const MIME = "image/jpeg";
// ARCHITECT: граница серверной AvatarUploadSchema, длиннее — 400; качество снижается здесь, а не на сервере.
const DATA_URL_MAX = 350_000;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/** Размер источника в пикселях: структурно его же даёт HTMLImageElement, поэтому математика тестируема. */
export interface CropSource {
    readonly width: number;
    readonly height: number;
}

/** Рамка кропа: сторона окна, зум и сдвиг картинки внутри окна в CSS-пикселях. */
export interface CropTransform {
    readonly viewport: number;
    readonly zoom: number;
    readonly offsetX: number;
    readonly offsetY: number;
}

export interface CropRect {
    /** Левый верхний угол области источника, которая попала в кадр, в пикселях источника. */
    readonly sx: number;
    readonly sy: number;
    /** Сторона квадрата кропа в пикселях источника. */
    readonly side: number;
    /** Масштаб «пиксель источника → пиксель превью»: им же задаётся размер картинки в превью. */
    readonly displayScale: number;
}

/** Проверяет тип и вес файла до декодирования: заведомо отклонённое не занимает память декодера. */
function assertAllowedFile(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("unsupported image type");
    if (file.size > MAX_FILE_BYTES) throw new Error("image is too large");
}

// ARCHITECT: EXIF-ориентацию к <img> применяет сам браузер (image-orientation: from-image по умолчанию),
// поэтому метаданные не разбираются вручную, а canvas при рендере EXIF всё равно снимает.
/** Декодирует выбранный файл в готовый к отрисовке элемент; любой сбой — ошибка без деталей. */
export async function decodeAvatarFile(file: File): Promise<HTMLImageElement> {
    assertAllowedFile(file);

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.src = url;

    try {
        await image.decode();

        return image;
    } catch {
        URL.revokeObjectURL(url);

        throw new Error("image could not be decoded");
    }
}

// ARCHITECT: blob-URL живёт, пока кроппер показывает картинку (превью берёт её из image.src), и
// освобождается вызывающим кодом при закрытии шага кропа — иначе blob до 8 МБ висит до выгрузки документа.
/** Освобождает blob-URL декодированного файла; источники других схем (data URL) не трогает. */
export function releaseAvatarSource(image: HTMLImageElement): void {
    if (!image.src.startsWith("blob:")) return;

    try {
        URL.revokeObjectURL(image.src);
    } catch {
        // ARCHITECT: в jsdom blob-URL нет — сбой освобождения не должен валить закрытие модалки.
    }
}

/** Масштаб «пиксель источника → пиксель превью»: cover по короткой стороне плюс пользовательский зум. */
function displayScaleOf(source: CropSource, transform: CropTransform): number {
    return (transform.viewport / Math.min(source.width, source.height)) * transform.zoom;
}

// ARCHITECT: превью и рендер считают кроп одной функцией: иначе человек видит одно, а получает другое.
/** Рамка кропа в координатах источника — единственный источник правды для превью и рендера. */
export function computeCropRect(source: CropSource, transform: CropTransform): CropRect {
    const displayScale = displayScaleOf(source, transform);
    const side = transform.viewport / displayScale;
    // ARCHITECT: offset приходит в пикселях превью, а центруется по пикселям источника — отсюда деление.
    const cx = source.width / 2 - transform.offsetX / displayScale;
    const cy = source.height / 2 - transform.offsetY / displayScale;

    return { sx: cx - side / 2, sy: cy - side / 2, side, displayScale };
}

/** Ближайшее допустимое смещение: картинка не отрывается от окна, пустых полос в кадре не бывает. */
export function clampOffset(
    source: CropSource,
    transform: CropTransform
): { readonly x: number; readonly y: number } {
    const displayScale = displayScaleOf(source, transform);
    const maxX = Math.max(0, (source.width * displayScale - transform.viewport) / 2);
    const maxY = Math.max(0, (source.height * displayScale - transform.viewport) / 2);

    return {
        x: Math.min(maxX, Math.max(-maxX, transform.offsetX)),
        y: Math.min(maxY, Math.max(-maxY, transform.offsetY)),
    };
}

/** Кодирует canvas в JPEG под лимит сервера: качество снижается ступенями, а не отправкой заведомо 400. */
function encodeToCap(canvas: HTMLCanvasElement): string {
    let quality = JPEG_QUALITY;
    let dataUrl = canvas.toDataURL(MIME, quality);

    while (dataUrl.length > DATA_URL_MAX && quality > 0.5) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL(MIME, quality);
    }

    if (dataUrl.length > DATA_URL_MAX) throw new Error("avatar is too large");

    return dataUrl;
}

/** Рендерит выбранную рамку в квадрат AVATAR_SIZE×AVATAR_SIZE и отдаёт готовый к загрузке data URL. */
export function renderCroppedAvatar(source: HTMLImageElement, transform: CropTransform): string {
    const rect = computeCropRect(source, transform);
    const canvas = document.createElement("canvas");

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");

    if (context === null) throw new Error("canvas is not available");

    context.drawImage(
        source,
        rect.sx,
        rect.sy,
        rect.side,
        rect.side,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE
    );

    return encodeToCap(canvas);
}
