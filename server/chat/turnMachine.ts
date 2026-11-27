// ARCHITECT: машина хода — правила «одна задача за раз»: пока задача не закрыта, новое задание не выдаётся, а
// вторая часть хода (M2) держится как отложенная. Модуль чистый: он решает, что делать с задачей, а запись
// состояния, проверку ответа и квоты держит роутер (§16.8).
// ARCHITECT: русский текст не разбираем: если сообщение преимущественно кириллицей, карточка исправления не
// создаётся, а счётчик попыток задачи растёт — ученик, скорее всего, просит помощи, а не отвечает (§спец. 5).

import { z } from "zod";

import type { Quiz } from "./contract.ts";
import { normalizeSentence, verifyQuizAnswer } from "./lessonState.ts";
import type { LessonWord, PendingTask } from "./lessonState.ts";

/** Сколько попыток даётся на викторину, прежде чем сервер раскроет ответ. */
export const MAX_QUIZ_ATTEMPTS = 2;
/** Сколько сообщений не по сути закрывают открытую задачу. */
export const MAX_OPEN_ATTEMPTS = 3;
/** Слов в сообщении, ниже которых ответ считается не по сути. */
export const MIN_ANSWER_WORDS = 3;
/** Пропуск в прозе: подчёркивания или пустые скобки — задание без карточки. */
const GAP = /_{2,}|\(\s*\)/;

// ARCHITECT: состояние викторины лежит в payload сообщения: после перезагрузки ленты видно, что ответ уже дан,
// и повторное прохождение невозможно (§спец. 9). Битая форма — null, то есть ответа не было.
export const QuizStateSchema = z.strictObject({
    answered: z.boolean(),
    selected: z.string().max(300).nullable(),
    correct: z.boolean(),
    attempts: z.number().int().min(0).max(9),
    revealed: z.boolean(),
});

export type QuizState = z.infer<typeof QuizStateSchema>;

/** Состояние викторины в payload сообщения. */
export function readQuizState(payload: unknown): QuizState | null {
    if (typeof payload !== "object" || payload === null) return null;

    const parsed = QuizStateSchema.safeParse(
        (payload as { readonly quizState?: unknown }).quizState
    );

    return parsed.success ? parsed.data : null;
}

/** Кириллица преимущественна: такой текст не правим и не разбираем (§спец. 5). */
export function isMostlyCyrillic(text: string): boolean {
    const cyrillic = text.match(/[а-яё]/gi)?.length ?? 0;
    const latin = text.match(/[a-z]/gi)?.length ?? 0;

    return cyrillic > 0 && cyrillic > latin;
}

/** Сколько слов в реплике: по нему решается, отвечает ученик по сути или отделывается словом. */
export function wordCount(text: string): number {
    return text.split(/\s+/).filter((part) => /[\p{L}]/u.test(part)).length;
}

/** Сообщение не отвечает по сути: слишком короткое, не на английском или без слов вовсе. */
export function isOffTopic(text: string): boolean {
    return isMostlyCyrillic(text) || wordCount(text) < MIN_ANSWER_WORDS;
}

/** Пропуск в прозе: предложение с ним и текст без него. null — пропуска в тексте нет. */
export function proseGap(text: string): {
    readonly sentence: string;
    readonly cleaned: string;
} | null {
    const lines = text.split("\n");
    const at = lines.findIndex((line) => GAP.test(line));

    if (at < 0) return null;

    const line = lines[at] ?? "";

    if (line.trim() === "") return null;

    const cleaned = lines
        .map((current, self) =>
            self === at
                ? // ARCHITECT: из строки убирается только предложение с пропуском: разбор репетитора остаётся.
                  current
                      .split(/(?<=[.!?])\s+/)
                      .filter((part) => !GAP.test(part))
                      .join(" ")
                      .trim()
                : current
        )
        .filter((current) => current.trim() !== "")
        .join("\n")
        .trim();

    return { sentence: line.trim(), cleaned };
}

/** Предложение без пропуска: по нему узнаётся, чей это пример. */
function withoutGap(value: string): string {
    return normalizeSentence(value.replace(new RegExp(GAP.source, "g"), " "));
}

/** Экранирование термина перед подстановкой в регулярное выражение. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Пример слова с вырезанным словом: с ним сравнивается предложение модели. */
function exampleWithoutWord(word: LessonWord): string {
    return normalizeSentence(
        word.example.replace(new RegExp(`\\b${escapeRegExp(word.word)}\\b`, "gi"), " ")
    );
}

/**
 * Карточка gap-fill из prose-задания: если пропуск стоит в примере слова урока, ответ известен, иначе карточка
 * строится из примера самого слова — сервер не выдумывает верный ответ (§спец. 6).
 */
export function gapFillFromProse(sentence: string, words: readonly LessonWord[]): Quiz | null {
    const stripped = withoutGap(sentence);

    for (const word of words)
        if (stripped === exampleWithoutWord(word))
            return { type: "gap-fill", prompt: sentence, answer: word.word };

    const named = words.find((current) => stripped.includes(normalizeSentence(current.word)));

    if (named !== undefined) return { type: "gap-fill", prompt: sentence, answer: named.word };

    const fallback = words[0];

    if (fallback === undefined) return null;

    return {
        type: "gap-fill",
        prompt: `Fill in the gap: ${fallback.example.replace(
            new RegExp(`\\b${escapeRegExp(fallback.word)}\\b`, "gi"),
            "___"
        )}`,
        answer: fallback.word,
    };
}

// ARCHITECT: варианты упрощённого повтора берутся из слов урока: так выбор всегда осмысленный, а верный ответ
// остаётся серверным — клиент его не придумывает (§спец. 3).
function distractors(words: readonly LessonWord[], correct: string): string[] {
    return words
        .map((word) => word.word)
        .filter((term) => normalizeSentence(term) !== normalizeSentence(correct))
        .slice(0, 1);
}

/** Упрощённый повтор: выбор из двух вариантов. null — упростить нечем, сервер раскроет ответ. */
export function simplifyQuiz(quiz: Quiz | null, words: readonly LessonWord[]): Quiz | null {
    if (quiz === null) return null;

    if (quiz.type === "choice") {
        const correct = quiz.options.find((option) => option.id === quiz.answerId);
        const other = quiz.options.find((option) => option.id !== quiz.answerId);

        if (correct === undefined || other === undefined) return null;

        // ARCHITECT: верный вариант встаёт вторым: место ответа не подсказывает его выбором по привычке.
        return {
            type: "choice",
            prompt: quiz.prompt,
            options: [other, correct],
            answerId: correct.id,
        };
    }

    const wrong = distractors(words, quiz.answer)[0];

    if (wrong === undefined) return null;

    return {
        type: "choice",
        prompt: quiz.prompt,
        options: [
            { id: "a", text: wrong },
            { id: "b", text: quiz.answer },
        ],
        answerId: "b",
    };
}

/** Задача-викторина по карточке: попыток пока ноль, тип берётся из карточки. */
export function quizTask(quiz: Quiz, messageId: string): PendingTask {
    return {
        kind: "quiz",
        messageId,
        prompt: quiz.prompt,
        attempts: 0,
        quizType: quiz.type,
    };
}

/** Открытая задача: явный вопрос без карточки — первый вопрос урока и просьбы ответить своими словами. */
export function openTask(messageId: string, prompt: string): PendingTask {
    return { kind: "open", messageId, prompt: prompt.slice(0, 300), attempts: 0, quizType: null };
}

/** Попытка по задаче: счётчик растёт, задача остаётся открытой до закрытия её правилом. */
export function withAttempt(task: PendingTask): PendingTask {
    return { ...task, attempts: Math.min(task.attempts + 1, 9) };
}

/** Верный ответ словами: раскрывается после исчерпания попыток. */
export function revealText(quiz: Quiz | null): string {
    if (quiz === null) return "";

    if (quiz.type === "choice")
        return quiz.options.find((option) => option.id === quiz.answerId)?.text ?? quiz.answerId;

    return quiz.answer;
}

/** Итог попытки: верность, упрощённый повтор, раскрытый ответ и признак закрытия задачи. */
export interface QuizAttemptResult {
    readonly correct: boolean;
    readonly attempts: number;
    readonly simplified: Quiz | null;
    readonly reveal: string | null;
    readonly done: boolean;
}

/**
 * Проверка ответа на викторину: сверка идёт с карточкой, сохранённой сервером (§16.2). Пока попытки не
 * исчерпаны, ученик получает упрощённый повтор; после исчерпания сервер раскрывает верный ответ (§спец. 3).
 */
export function judgeQuiz(
    quiz: Quiz | null,
    answer: string,
    attempts: number,
    words: readonly LessonWord[]
): QuizAttemptResult {
    const correct = verifyQuizAnswer(quiz, answer) === true;
    const next = Math.min(attempts + 1, 9);

    if (correct)
        return { correct: true, attempts: next, simplified: null, reveal: null, done: true };

    if (next >= MAX_QUIZ_ATTEMPTS)
        return {
            correct: false,
            attempts: next,
            simplified: null,
            reveal: revealText(quiz),
            done: true,
        };

    return {
        correct: false,
        attempts: next,
        simplified: simplifyQuiz(quiz, words),
        reveal: null,
        done: false,
    };
}
