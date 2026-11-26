// ARCHITECT: контракт чата — единственное место, где описаны тело запроса, маркер карточек и их схема:
// роутер и транспорт читают форму отсюда, поэтому она не расползается по файлам (§16.13).
// ARCHITECT: вывод модели — недоверенные данные (§16.2, §16.8): JSON карточек разбирается strictObject,
// никогда не исполняется и не трактуется как команды — инструментов у модели в фазе C нет.
import { z } from "zod";

/** Маркер, с которого в ответе модели начинается JSON карточек: всё после него — данные, а не текст. */
export const CARDS_MARKER = "<<<CARDS>>>";

// ARCHITECT: тело — ровно два поля: userId/level/plan/tutorId/mode/quota клиент не присылает, их выводят
// из проверенного токена, своей сессии, placement_results и entitlements (§16.2). Лишние поля → 400.
export const ChatRequestSchema = z.strictObject({
    sessionId: z.uuid(),
    message: z.string().trim().min(1).max(2000),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ARCHITECT: границы полей совпадают с CHECK-ами схемы (term 1..120, translation <=240, context <=500):
// карточка слова сразу становится строкой vocabulary, поэтому длину ограничивает та же схема.
export const VocabWordSchema = z.strictObject({
    term: z.string().trim().min(1).max(120),
    translation: z.string().trim().max(240),
    context: z.string().trim().max(500),
});

export type VocabWord = z.infer<typeof VocabWordSchema>;

/** Фрагмент правки: исправленная фраза ученика, правило и примеры к нему. */
export const CorrectionSchema = z.strictObject({
    fragment: z.string().trim().min(1).max(240),
    rule: z.string().trim().min(1).max(240),
    examples: z.array(z.string().trim().min(1).max(240)).max(3),
});

export type Correction = z.infer<typeof CorrectionSchema>;

// ARCHITECT: квиз — размеченное объединение по type: поля чужого типа отклоняются, а не игнорируются.
// Верный ответ входит в карточку: проверку делает клиент, у модели нет инструментов проверки (§16.8).
export const QuizSchema = z.discriminatedUnion("type", [
    z.strictObject({
        type: z.literal("gap-fill"),
        prompt: z.string().trim().min(1).max(300),
        answer: z.string().trim().min(1).max(120),
    }),
    z.strictObject({
        type: z.literal("choice"),
        prompt: z.string().trim().min(1).max(300),
        options: z
            .array(
                z.strictObject({
                    id: z.string().trim().min(1).max(8),
                    text: z.string().trim().min(1).max(240),
                })
            )
            .min(2)
            .max(4),
        answerId: z.string().trim().min(1).max(8),
    }),
    z.strictObject({
        type: z.literal("word-order"),
        prompt: z.string().trim().min(1).max(300),
        words: z.array(z.string().trim().min(1).max(60)).min(2).max(12),
        answer: z.string().trim().min(1).max(300),
    }),
]);

export type Quiz = z.infer<typeof QuizSchema>;

/** JSON карточек: правки и квиз необязательны, но ключи обязаны присутствовать (null вместо пропуска). */
export const ChatCardsSchema = z.strictObject({
    corrections: z.array(CorrectionSchema).max(4),
    quiz: QuizSchema.nullable(),
    vocabWord: VocabWordSchema.nullable(),
});

export type ChatCards = z.infer<typeof ChatCardsSchema>;

/** Использование модели в событии done: токены провайдера, модель и остаток дневной квоты сообщений. */
export interface ChatUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly model: string;
    readonly messagesRemaining: number;
}

/** Контракт события done: текст ответа, карточки и usage — ровно то, что клиент кладёт в сообщение. */
export interface ChatDonePayload {
    readonly reply: string;
    readonly corrections: readonly Correction[];
    readonly quiz: Quiz | null;
    readonly vocabWord: VocabWord | null;
    readonly usage: ChatUsage;
}

/**
 * Делит ответ модели на текст и JSON карточек: маркер один, всё после первого — данные.
 * cardsJson = null, если маркера нет: ответ без карточек считается битым (см. роутер).
 */
export function splitCards(raw: string): {
    readonly text: string;
    readonly cardsJson: string | null;
} {
    const at = raw.indexOf(CARDS_MARKER);

    if (at < 0) return { text: raw.trim(), cardsJson: null };

    return {
        text: raw.slice(0, at).trim(),
        cardsJson: raw.slice(at + CARDS_MARKER.length).trim(),
    };
}

// ARCHITECT: маркер вырезается из текста пользователя до подстановки в промпт: иначе своим сообщением
// можно было бы подделать блок карточек и подсунуть клиенту чужой JSON (§16.8).
/** Убирает все вхождения маркера, не склеивая соседние слова. */
export function stripCardsMarker(text: string): string {
    return text
        .split(CARDS_MARKER)
        .join(" ")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

/** Разбор карточек: битый JSON или чужая форма — null, то есть битый ответ модели. */
export function parseCards(cardsJson: string | null): ChatCards | null {
    if (cardsJson === null) return null;

    let parsed: unknown;

    try {
        parsed = JSON.parse(cardsJson);
    } catch {
        return null;
    }

    const result = ChatCardsSchema.safeParse(parsed);

    return result.success ? result.data : null;
}
