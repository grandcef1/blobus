    // ARCHITECT: Общий источник данных блобатаров из бегущей строки FeaturesSection
    // Используется в FeaturesSection (BlobatarMarquee), мастере, сайдбаре и дашборде

    import type { Blobatar, BlobatarId } from "@/types/blobatar";

    export const MOCK_BLOBATARS: Blobatar[] = [
    {
        id: "miya",
        name: "Мия",
        traits: {
        shape: 0.8,
        hue: 0.92,
        tone: [0.6, 0.9],
        "eye.gap": 0.4,
        "eye.rx": 0.7,
        "eye.lean": 0.2,
        "body.r": 0.3,
        "body.n": 0.6,
        "body.ratio": 0,
        },
    },
    {
        id: "oscar",
        name: "Оскар",
        traits: {
        shape: 0.2,
        hue: 0.55,
        tone: [0.3, 0.6],
        "eye.gap": 0.25,
        "eye.rx": 1.2,
        "eye.lean": 0.6,
        "body.r": 0.7,
        "body.n": 1.3,
        "body.ratio": 0,
        },
    },
    {
        id: "luna",
        name: "Луна",
        traits: {
        shape: 0.65,
        hue: 0.72,
        tone: [0.4, 0.7],
        "eye.gap": 0.35,
        "eye.rx": 0.9,
        "eye.lean": 0.3,
        "body.r": 0.4,
        "body.n": 1,
        "body.ratio": 0.2,
        },
    },
    {
        id: "max",
        name: "Макс",
        traits: {
        shape: 0.15,
        hue: 0.08,
        tone: [0.5, 0.85],
        "eye.gap": 0.5,
        "eye.rx": 1.1,
        "eye.lean": 0.1,
        "body.r": 0.8,
        "body.n": 1.5,
        "body.ratio": 0,
        },
    },
    {
        id: "alex",
        name: "Алекс",
        traits: {
        shape: 0.45,
        hue: 0.33,
        tone: [0.25, 0.55],
        "eye.gap": 0.28,
        "eye.rx": 0.85,
        "eye.lean": 0.45,
        "body.r": 0.5,
        "body.n": 0.9,
        "body.ratio": 0,
        },
    },
    {
        id: "zoe",
        name: "Зои",
        traits: {
        shape: 0.9,
        hue: 0.15,
        tone: [0.55, 0.9],
        "eye.gap": 0.42,
        "eye.rx": 0.65,
        "eye.lean": 0.25,
        "body.r": 0.25,
        "body.n": 1,
        "body.ratio": -0.1,
        },
    },
    {
        id: "nova",
        name: "Нова",
        traits: {
        shape: 0.55,
        hue: 0.45,
        tone: [0.5, 0.8],
        "eye.gap": 0.32,
        "eye.rx": 0.95,
        "eye.lean": 0.35,
        "body.r": 0.45,
        "body.n": 1,
        "body.ratio": 0,
        },
    },
    {
        id: "kai",
        name: "Кай",
        traits: {
        shape: 0.35,
        hue: 0.62,
        tone: [0.35, 0.65],
        "eye.gap": 0.38,
        "eye.rx": 1.05,
        "eye.lean": 0.42,
        "body.r": 0.55,
        "body.n": 1.1,
        "body.ratio": 0,
        },
    },
    {
        id: "lira",
        name: "Лира",
        traits: {
        shape: 0.75,
        hue: 0.82,
        tone: [0.45, 0.75],
        "eye.gap": 0.45,
        "eye.rx": 0.75,
        "eye.lean": 0.28,
        "body.r": 0.35,
        "body.n": 1,
        "body.ratio": 0.15,
        },
    },
    {
        id: "orion",
        name: "Орион",
        traits: {
        shape: 0.25,
        hue: 0.18,
        tone: [0.4, 0.7],
        "eye.gap": 0.48,
        "eye.rx": 1.15,
        "eye.lean": 0.15,
        "body.r": 0.65,
        "body.n": 1.4,
        "body.ratio": 0,
        },
    },
    ];

    // ARCHITECT: мок сессий первой итерации ссылается на старые id репетиторов
    // (aria, sophia, oliver). Карта нормализует их в текущие id блобатаров,
    // чтобы аватары рисовались везде. Удалить после нормализации sessions.ts.
    const LEGACY_BLOBATAR_IDS: Record<string, BlobatarId> = {
    aria: "miya",
    sophia: "luna",
    oliver: "oscar",
    };

    export function getBlobatarById(id: string): Blobatar | undefined {
    const legacyId = LEGACY_BLOBATAR_IDS[id];
    return MOCK_BLOBATARS.find((b) => b.id === id || b.id === legacyId);
    }