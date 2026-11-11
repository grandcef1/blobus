    // ARCHITECT: Типы для блобатаров, общий источник для бегущей строки и мастера

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

    export interface Blobatar {
    id: string;
    name: string;
    traits: BlobatarTraits;
    }

    export type BlobatarId = "miya" | "oscar" | "luna" | "max" | "alex" | "zoe" | "nova" | "kai" | "lira" | "orion";