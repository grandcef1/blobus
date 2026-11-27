// ARCHITECT: контент урока — один каталог: сцены-сиды, твисты, рамки предложений и значения целевых слов.
// Выбирает их движок (server/chat/lessonState.ts), а не модель: урок воспроизводим, а карточка слова и
// словарь берут значение из одного места (§16.8, §5.4).

import type { PlanLocale } from "./lessonPlan.ts";

/** Контекст, который сцена разрешает сама: без её слова модель об утре, выходных и семье не говорит. */
export const CONTEXT_TAGS = ["morning", "weekend", "family"] as const;

export type ContextTag = (typeof CONTEXT_TAGS)[number];

/** Сцена-сид урока: место действия, которое задаёт обстановку всех ходов. */
export interface SeedScene {
    readonly id: string;
    /** Обстановка для промпта: строку читает только модель, ученику она не показывается. */
    readonly setting: string;
    readonly allows: readonly ContextTag[];
}

/** Двадцать сцен: сцена последних пяти уроков исключается, поэтому запаса хватает на неделю занятий. */
export const SEED_SCENES: readonly SeedScene[] = [
    {
        id: "airport",
        setting: "аэропорт: стойка регистрации, задержанный рейс, разговор у выхода",
        allows: [],
    },
    {
        id: "call-centre",
        setting: "колл-центр: жалоба клиента и оператор, который ищет решение",
        allows: [],
    },
    {
        id: "rush-cafe",
        setting: "кафе в час пик: очередь, свободный столик, заказ на бегу",
        allows: [],
    },
    {
        id: "stadium",
        setting: "стадион: последняя минута матча и разговор на трибуне",
        allows: ["weekend"],
    },
    {
        id: "moving-day",
        setting: "переезд: коробки и первый день в новой квартире",
        allows: ["family"],
    },
    {
        id: "space-station",
        setting: "космическая станция: смена экипажа и переговоры с центром",
        allows: [],
    },
    { id: "museum", setting: "музей: зал с одним экспонатом, который все обходят", allows: [] },
    { id: "cooking-show", setting: "кулинарное шоу: минута до подачи блюда судьям", allows: [] },
    { id: "tail-job", setting: "слежка: две машины, один перекрёсток и рация", allows: [] },
    {
        id: "zoo-webcam",
        setting: "вебкамера в зоопарке: дежурный у экрана и странное поведение животного",
        allows: [],
    },
    {
        id: "festival",
        setting: "фестиваль: сцена, организатор и опоздавший музыкант",
        allows: ["weekend"],
    },
    {
        id: "broken-call",
        setting: "видеозвонок со сбоем: звук пропадает, приходится переспрашивать",
        allows: [],
    },
    {
        id: "film-set",
        setting: "съёмочная площадка: дубль, свет и реплика, которую не слышно",
        allows: [],
    },
    {
        id: "holiday-post",
        setting: "почта в праздники: очередь за посылкой и подменный курьер",
        allows: ["family"],
    },
    {
        id: "mountain-hut",
        setting: "горная хижина: туман, карта и незнакомый попутчик",
        allows: [],
    },
    { id: "newsroom", setting: "редакция: материал сдают через двадцать минут", allows: [] },
    { id: "warehouse", setting: "склад: накладная, недостающая коробка и кладовщик", allows: [] },
    {
        id: "dance-school",
        setting: "школа танцев: первое занятие и партнёр, который не помнит шагов",
        allows: [],
    },
    {
        id: "beach-patrol",
        setting: "пляжный патруль: утренняя сводка и найденная сумка",
        allows: ["morning"],
    },
    {
        id: "night-shift",
        setting: "ночная смена: пустой офис, незнакомый звук и дежурный",
        allows: [],
    },
];

/** Твист: сцена меняется после шестого хода, чтобы урок не шёл по прямой. */
export const TWISTS: readonly string[] = [
    "внезапно пропадает связь, и всё приходится переспросить",
    "главный герой сцены оказывается не тем, за кого себя выдавал",
    "появляется второй участник со своей версией событий",
    "находится старая записка, которая меняет причину разговора",
    "оказывается, что все ждали совсем другого человека",
    "одно слово из начала сцены понимают неверно, и это всё объясняет",
    "сцена меняется на противоположную по настроению: спокойную",
    "время поджимает, и решение нужно принять одной фразой",
];

// ARCHITECT: рамок шесть, а ход берёт следующую по кругу: внутри трёх ходов подряд рамка не повторится
// (длина круга больше трёх), поэтому «рамка не повторяется три хода» держится без хранения истории рамок.
/** Рамка предложения: с неё начинается практика, ученик говорит по образцу. */
export const SENTENCE_FRAMES: readonly string[] = [
    "I usually ___.",
    "Yesterday I ___.",
    "If I had time, I would ___.",
    "There is ___ near my home.",
    "Before I left, I ___.",
    "The last time I ___ was ___.",
];

/** Тип активности хода: вопрос выбора, пропуск, порядок слов или собственное предложение ученика. */
export const ACTIVITY_TYPES = ["choice", "gap-fill", "word-order", "sentence"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Значение целевого слова на языке объяснений и пример английской речи: их показывают карточка и словарь. */
export interface WordEntry {
    readonly ru: string;
    readonly en: string;
    readonly es: string;
    readonly example: string;
}

// ARCHITECT: ключи совпадают с BAND_WORDS из lessonPlan.ts: список слов урока остаётся один, а здесь только
// значение и пример — расхождение видно тесту каталога (§5.4).
export const WORD_BANK: Record<string, WordEntry> = {
    breakfast: {
        ru: "завтрак",
        en: "the first meal of the day",
        es: "desayuno",
        example: "I skip breakfast when I am late.",
    },
    weekend: {
        ru: "выходные",
        en: "Saturday and Sunday",
        es: "fin de semana",
        example: "We plan the weekend on Friday evening.",
    },
    neighbour: {
        ru: "сосед",
        en: "someone who lives next door",
        es: "vecino",
        example: "My neighbour waters my plants.",
    },
    tired: {
        ru: "уставший",
        en: "needing rest",
        es: "cansado",
        example: "I am tired after the night shift.",
    },
    shopping: {
        ru: "покупки",
        en: "buying things in shops",
        es: "compras",
        example: "Shopping takes me an hour on Saturday.",
    },
    deadline: {
        ru: "срок",
        en: "the time by which work must be done",
        es: "fecha límite",
        example: "The deadline is Friday at noon.",
    },
    improve: {
        ru: "улучшать",
        en: "to make better",
        es: "mejorar",
        example: "I want to improve my pronunciation.",
    },
    decision: {
        ru: "решение",
        en: "a choice you make",
        es: "decisión",
        example: "It was a hard decision to make.",
    },
    reliable: {
        ru: "надёжный",
        en: "someone you can trust",
        es: "fiable",
        example: "So far the plan looks reliable.",
    },
    opportunity: {
        ru: "возможность",
        en: "a chance to do something",
        es: "oportunidad",
        example: "This is a good opportunity to practise.",
    },
    "trade-off": {
        ru: "компромисс",
        en: "giving up one thing to get another",
        es: "compromiso",
        example: "Every trade-off costs something.",
    },
    assumption: {
        ru: "допущение",
        en: "something taken as true without proof",
        es: "suposición",
        example: "That assumption needs a test.",
    },
    leverage: {
        ru: "рычаг",
        en: "power you can use to get results",
        es: "apalancamiento",
        example: "She used the deadline as leverage.",
    },
    nuance: {
        ru: "нюанс",
        en: "a small difference that matters",
        es: "matiz",
        example: "The nuance changes the whole answer.",
    },
    constraint: {
        ru: "ограничение",
        en: "a limit you must work within",
        es: "restricción",
        example: "Time is the main constraint here.",
    },
};

/** Сцена по id: неизвестный id (старая строка) ведёт себя как первая сцена каталога. */
export function sceneById(id: string): SeedScene {
    return SEED_SCENES.find((scene) => scene.id === id) ?? (SEED_SCENES[0] as SeedScene);
}

/** Позиция сцены в каталоге: по ней двигаются твист и рамка предложения. */
export function seedPosition(id: string): number {
    const at = SEED_SCENES.findIndex((scene) => scene.id === id);

    return at < 0 ? 0 : at;
}

/** Сцена по индексу с исключением последних уроков: пропущенная сцена сдвигает выбор, а не отменяет его. */
export function pickSeed(index: number, exclude: readonly string[]): SeedScene {
    const offset = Math.abs(Math.trunc(index)) % SEED_SCENES.length;

    for (let step = 0; step < SEED_SCENES.length; step += 1) {
        const scene = SEED_SCENES[(offset + step) % SEED_SCENES.length];

        if (scene !== undefined && !exclude.includes(scene.id)) return scene;
    }

    // ARCHITECT: все двадцать сцен исключены (аномалия данных): урок берёт первую, а не остаётся без сцены.
    return SEED_SCENES[0] as SeedScene;
}

/** Твист сцены: null до седьмого хода — раньше сцена не меняется. */
export function twistFor(index: number, turnIndex: number): string | null {
    if (turnIndex < 7) return null;

    return TWISTS[Math.abs(Math.trunc(index) + turnIndex) % TWISTS.length] ?? null;
}

/** Рамка предложения этого хода: круг длиннее трёх, поэтому подряд рамка не повторяется. */
export function frameFor(index: number, turnIndex: number): string {
    const at = Math.abs(Math.trunc(index) + turnIndex) % SENTENCE_FRAMES.length;

    return SENTENCE_FRAMES[at] ?? (SENTENCE_FRAMES[0] as string);
}

/** Значение целевого слова на языке объяснений: незнакомое слово остаётся собой, а не пустой строкой. */
export function wordMeaning(term: string, locale: PlanLocale): string {
    const entry = WORD_BANK[term];

    if (entry === undefined) return term;

    return entry[locale];
}

/** Пример английской речи с целевым словом: из него собирается и карточка, и fallback-викторина. */
export function wordExample(term: string): string {
    return WORD_BANK[term]?.example ?? `I use the word ${term} in a sentence.`;
}
