// ARCHITECT: задание повторения собирается детерминированно из данных слова и остального словаря ученика: ни
// модели, ни затрат — очередь повторения ничего не стоит (§16.9). Форма задания — та же викторина, что в чате
// (chat/contract.ts), поэтому клиент рисует её существующими карточками, а прогресс Лейтнера остаётся прежним.
// ARCHITECT: проверка ответа идёт на клиенте, как и в викторине чата: верный ответ входит в задание, а сервер
// двигает шаг только по исходу карточки (§16.8).
import { QuizSchema } from "./chat/contract.ts";
import type { Quiz } from "./chat/contract.ts";

/** Слово очереди: ровно те поля, из которых собирается задание. */
export interface ReviewWord {
    readonly id: string;
    readonly term: string;
    readonly translation: string | null;
    readonly context: string | null;
    readonly stage: number;
}

// ARCHITECT: три варианта в выборе: верный плюс два дистрактора — короче читается, а длинный список угадывается.
const CHOICE_OPTIONS = 3;
/** Границы word-order в схеме викторины: больше двенадцати слов она не примет. */
const MAX_ORDER_WORDS = 12;
/** Границы prompt/answer в схеме викторины: длинный пример в задание не влезает. */
const MAX_TASK_TEXT = 300;
const MAX_TERM = 120;
const MAX_TRANSLATION = 240;
const GAP = "___";

// ARCHITECT: единственная точка, где задание становится данными: кандидат проверяется схемой викторины, поэтому
// набор, который не отрисует клиент, наружу уйти не может (§16.6, §16.13).
function toTask(candidate: unknown): Quiz | null {
    const parsed = QuizSchema.safeParse(candidate);

    return parsed.success ? parsed.data : null;
}

/** Предложение с пропуском вместо слова: null — слово в примере не встречается или пример слишком длинный. */
function gapFillTask(context: string, term: string): Quiz | null {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prompt = context.replace(new RegExp(`\\b${escaped}\\b`, "gi"), GAP);

    if (prompt === context || prompt.length > MAX_TASK_TEXT) return null;

    return toTask({ type: "gap-fill", prompt, answer: term });
}

// ARCHITECT: последний вариант задания — перевод становится подсказкой: слово без примера всё равно повторяется,
// а формат «___ — перевод» читается как карточка и не требует языка интерфейса.
function hintGapFillTask(term: string, translation: string): Quiz | null {
    const prompt = `${GAP} — ${translation}`;

    if (prompt.length > MAX_TASK_TEXT || term.length > MAX_TERM) return null;

    return toTask({ type: "gap-fill", prompt, answer: term });
}

/** Собрать предложение из слов примера: null — пример не подходит по длине. */
function wordOrderTask(context: string, hint: string): Quiz | null {
    const words = context.split(/\s+/).filter((word) => word !== "");

    if (words.length < 2 || words.length > MAX_ORDER_WORDS || context.length > MAX_TASK_TEXT) return null;

    return toTask({ type: "word-order", prompt: hint.slice(0, MAX_TASK_TEXT), words, answer: context });
}

/**
 * Выбор перевода: дистракторы берутся из других слов ученика в порядке чтения словаря, поэтому задание
 * детерминировано, а совпадение с верным ответом исключено. null — перевода нет или дистракторов не нашлось.
 */
function choiceTask(word: ReviewWord, others: readonly ReviewWord[]): Quiz | null {
    const correct = word.translation?.trim() ?? "";

    if (correct === "" || correct.length > MAX_TRANSLATION) return null;

    const seen = new Set([correct.toLowerCase()]);
    const distractors: string[] = [];

    for (const other of others) {
        if (distractors.length >= CHOICE_OPTIONS - 1) break;

        const candidate = other.translation?.trim() ?? "";

        if (candidate === "" || candidate.length > MAX_TRANSLATION) continue;

        const key = candidate.toLowerCase();

        if (seen.has(key)) continue;

        seen.add(key);
        distractors.push(candidate);
    }

    if (distractors.length === 0) return null;

    // ARCHITECT: место верного варианта выводится из слова, а не из случайности: задание воспроизводимо, но не
    // отдаёт ответ первой строкой каждый раз.
    const correctIndex = word.term.length % (distractors.length + 1);
    const texts = [...distractors];

    texts.splice(correctIndex, 0, correct);

    const options = texts.map((text, index) => ({ id: String.fromCharCode(97 + index), text }));

    return toTask({
        type: "choice",
        prompt: word.term.slice(0, MAX_TASK_TEXT),
        options,
        answerId: String.fromCharCode(97 + correctIndex),
    });
}

/**
 * Задание для слова: тип зависит от шага и данных. Чем дальше шаг, тем труднее форма — на поздних шагах сборка
 * предложения, затем пропуск в примере, затем выбор перевода. null — из слова задание не собрать.
 */
export function buildReviewTask(word: ReviewWord, others: readonly ReviewWord[]): Quiz | null {
    const context = word.context?.trim() ?? "";
    const hint = word.translation?.trim() ?? "";

    if (word.stage >= 4 && context !== "" && hint !== "") {
        const late = wordOrderTask(context, hint);

        if (late !== null) return late;
    }

    if (context !== "") {
        const gapped = gapFillTask(context, word.term);

        if (gapped !== null) return gapped;
    }

    if (hint !== "") {
        const choice = choiceTask(word, others);

        return choice ?? hintGapFillTask(word.term, hint);
    }

    return null;
}

/** Элемент очереди повторения: слово и задание к нему. */
export interface ReviewQueueItem {
    readonly id: string;
    readonly stage: number;
    readonly task: Quiz;
}

/** Очередь повторения в порядке чтения слов: слова без задания пропускаются, размер ограничивает вызывающий. */
export function buildReviewQueue(words: readonly ReviewWord[], limit: number): ReviewQueueItem[] {
    const queue: ReviewQueueItem[] = [];

    for (const word of words) {
        if (queue.length >= limit) break;

        const task = buildReviewTask(word, words);

        if (task === null) continue;

        queue.push({ id: word.id, stage: word.stage, task });
    }

    return queue;
}
