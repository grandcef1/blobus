// ARCHITECT: типы блобатаров. Персона — единственный источник характера персонажа: карточки
// выбора, чат, профиль и бегущая строка лендинга читают одни и те же строки, поэтому
// выдуманные описания в производных моках больше не нужны. Геометрия (traits) живёт отдельным
// полем: это форма и палитра, а не текст.

export interface BlobatarTraits {
    shape: number;
    hue: number;
    tone: [number, number];
    "eye.gap": number;
    "eye.rx": number;
    "eye.lean": number;
    "body.r": number;
    "body.n": number; // ARCHITECT: обязательно для совместимости с @blobatar/react
    "body.ratio": number; // ARCHITECT: обязательно для совместимости с @blobatar/react
    [key: string]: number | number[]; // ARCHITECT: индексная сигнатура без undefined
}

/** Черты характера: ровно три строки — длину проверяет компилятор, а не глаза. */
export type BlobatarPersonaTraits = readonly [string, string, string];

export interface BlobatarPersona {
    /** Три черты, показываются одной строкой через разделитель. */
    traits: BlobatarPersonaTraits;
    /** Одна строка о стиле преподавания: видна на карточке всегда. */
    teachingStyle: string;
    /** История происхождения: раскрывается по кнопке под описанием. */
    story: string;
}

export interface Blobatar {
    id: BlobatarId;
    name: string;
    traits: BlobatarTraits;
    persona: BlobatarPersona;
}

export type BlobatarId = "miya" | "oscar" | "luna" | "max" | "alex" | "zoe" | "nova" | "kai" | "lira" | "orion";
