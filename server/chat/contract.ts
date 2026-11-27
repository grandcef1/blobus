// ARCHITECT: контракт чата — единственное место, где описаны тело запроса, маркер карточек и их схема:
// роутер и транспорт читают форму отсюда, поэтому она не расползается по файлам (§16.13).
// ARCHITECT: вывод модели — недоверенные данные (§16.2, §16.8): JSON карточек разбирается strictObject,
// никогда не исполняется и не трактуется как команды — инструментов у модели в фазе C нет.
import { z } from "zod";

import type { LessonPlanDto } from "./lessonPlan.ts";

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

/** Фрагмент правки: дословный фрагмент реплики ученика, правило и примеры к нему. */
export const CorrectionSchema = z.strictObject({
    // ARCHITECT: fragment — подстрока сообщения ученика (её проверяет keepVerbatimCorrections): клиент
    // подчёркивает ровно этот участок реплики, поэтому «исправленный вариант» уходит в rule и examples.
    fragment: z.string().trim().min(1).max(240),
    rule: z.string().trim().min(1).max(240),
    examples: z.array(z.string().trim().min(1).max(240)).max(3).default([]),
    // ARCHITECT: вид правки решает её вес: error — настоящая ошибка (разбор правила и подчёркивание),
    // polish — апостроф, регистр и пунктуация (клиент показывает только исправленный вариант). Дефолт
    // строгий: непомеченная правка считается значимой, а не мелкой.
    kind: z.enum(["error", "polish"]).default("error"),
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

// ARCHITECT: карточки опциональны целиком: модель вправе не прислать ни одного блока, поэтому отсутствующий
// ключ — это пустой блок, а не битый ответ (§16.8). Лишние ключи по-прежнему отклоняются.
/** JSON карточек: все три блока необязательны, отсутствие ключа равно пустому значению. */
export const ChatCardsSchema = z.strictObject({
    corrections: z.array(CorrectionSchema).max(4).default([]),
    quiz: QuizSchema.nullable().default(null),
    vocabWord: VocabWordSchema.nullable().default(null),
    // ARCHITECT: вторая часть хода — следующая активность или вопрос: модель отдаёт её тем же JSON, а сервер
    // сохраняет отдельным сообщением (routes/chat.ts) и отдаёт клиенту полем followUp. Отсутствие ключа —
    // ход из одной части, а не битый ответ: как и прочие карточки, вторая часть best-effort (§16.8).
    followUp: z.string().trim().max(600).nullable().default(null),
});

export type ChatCards = z.infer<typeof ChatCardsSchema>;

/** Использование модели в событии done: токены провайдера, модель и остаток дневной квоты сообщений. */
export interface ChatUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly model: string;
    readonly messagesRemaining: number;
}

/** Контракт события done: текст ответа, карточки, профиль голоса и usage — ровно то, что клиент кладёт в сообщение. */
export interface ChatDonePayload {
    readonly reply: string;
    /** Вторая часть хода: следующая активность или вопрос; null — ход из одной части. */
    readonly followUp: string | null;
    readonly corrections: readonly Correction[];
    readonly quiz: Quiz | null;
    readonly vocabWord: VocabWord | null;
    /** План урока без целевых слов: карточка цели и счётчики прогресса. */
    readonly plan: LessonPlanDto;
    // ARCHITECT: голос репетитора уходит вместе с ответом: модель его не выбирает, значение берётся из
    // каталога по tutor_id сессии (server/tutorCatalog.ts).
    readonly voiceId: string;
    readonly usage: ChatUsage;
}

// ARCHITECT: fragment — недоверенный вывод модели, но требование к нему сильнее схемы: он обязан быть
// подстрокой сообщения ученика, иначе подчёркивать в реплике нечего. Такие правки отбрасываются, а не
// роняют ответ: текст репетитора важнее испорченной карточки (§16.8).
/** Оставляет только правки, чей фрагмент дословно входит в сообщение ученика. */
export function keepVerbatimCorrections(
    corrections: readonly Correction[],
    message: string
): Correction[] {
    return corrections.filter((correction) => message.includes(correction.fragment));
}

/**
 * Делит ответ модели на текст и JSON карточек: маркер один, всё после первого — данные.
 * cardsJson = null, если маркера нет: ответ без карточек — обычный ответ, а не битый (см. resolveCards).
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

/** Разбор карточек: битый JSON или чужая форма — null, то есть карточек нет. */
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

/** Итог разбора карточек: карточки есть либо ответ идёт без них — с причиной для строки лога. */
export type CardsOutcome =
    | { readonly kind: "cards"; readonly cards: ChatCards }
    | { readonly kind: "dropped"; readonly reason: "missing" | "malformed" };

/**
 * Карточки — best-effort: ни отсутствие маркера, ни битый JSON не делают ответ битым, поэтому наружу уходит
 * либо набор карточек, либо причина отказа — без текста реплики и без самого JSON (§16.8, §16.11). Правки
 * сверяются с сообщением ученика, а квиз остаётся только при настоящей ошибке: на одних полировках он не нужен.
 */
export function resolveCards(cardsJson: string | null, message: string): CardsOutcome {
    if (cardsJson === null) return { kind: "dropped", reason: "missing" };

    const cards = parseCards(cardsJson);

    if (cards === null) return { kind: "dropped", reason: "malformed" };

    const corrections = keepVerbatimCorrections(cards.corrections, message);
    const quiz = corrections.some((correction) => correction.kind === "error") ? cards.quiz : null;
    // ARCHITECT: пустая вторая часть равна её отсутствию: клиент не рисует пустой пузырь.
    const followUp = cards.followUp === null || cards.followUp === "" ? null : cards.followUp;

    return { kind: "cards", cards: { corrections, quiz, vocabWord: cards.vocabWord, followUp } };
}
