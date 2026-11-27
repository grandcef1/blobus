// ARCHITECT: транспорт чата: мок-ветка пишет реплику в общее мок-хранилище сессий (поведение до сервера),
// real-ветка читает настоящий SSE-поток POST /api/chat. Адресов и ключей провайдера на клиенте нет: текст
// модели собирает сервер, а карточки приходят уже проверенными его схемой (§16.2, §16.3).
// ARCHITECT: сам fetch живёт в src/api/client.ts (cookie-сессия, CSRF, 401→refresh), поэтому модуль api/*
// сеть не дёргает (§16.13), а поток читается из ответа apiStream.
// ARCHITECT: вывод модели недоверенный и на клиенте (§16.8): кадр done разбирается по полям, чужая форма
// считается обрывом потока, а не данными для рендера.

import { ApiError, apiFetch, apiStream } from "@/api/client";
import { appendMessage, getSessionById } from "@/api/sessions";
import type { EnhancedChatSession } from "@/types/session";

/** Мок-ветка: реплика пользователя попадает в общее мок-хранилище сессий, ответ рисует мок-лента. */
export function sendMessage(sessionId: string, content: string): EnhancedChatSession | undefined {
    const text = content.trim();
    if (!text) return getSessionById(sessionId);

    return appendMessage(sessionId, { role: "user", content: text });
}

/** Правка карточки: дословный фрагмент реплики ученика, правило и примеры к нему. */
export interface ChatCorrection {
    readonly fragment: string;
    readonly rule: string;
    readonly examples: readonly string[];
    /** Вид правки: error — настоящая ошибка (разбор правила), polish — апостроф, регистр, пунктуация. */
    readonly kind: "error" | "polish";
}

/** Вариант квиза: верный ответ входит в карточку — проверку делает клиент, у модели нет инструментов. */
export interface ChatQuizOption {
    readonly id: string;
    readonly text: string;
}

// ARCHITECT: размеченное объединение по type: поля чужого типа на клиенте не читаются, карточка рисуется
// ровно тем компонентом, чей тип пришёл, и форму не угадывает.
export type ChatQuiz =
    | { readonly type: "gap-fill"; readonly prompt: string; readonly answer: string }
    | {
          readonly type: "choice";
          readonly prompt: string;
          readonly options: readonly ChatQuizOption[];
          readonly answerId: string;
      }
    | {
          readonly type: "word-order";
          readonly prompt: string;
          readonly words: readonly string[];
          readonly answer: string;
      };

/** Слово урока: сервер уже положил его в словарь, карточка только показывает результат. */
export interface ChatVocabWord {
    readonly term: string;
    readonly translation: string;
    readonly context: string;
}

/** Токены, модель и остаток дневной квоты: остаток считает сервер, клиент его не выводит. */
export interface ChatUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly model: string;
    readonly messagesRemaining: number;
}

/** Контракт события done целиком: текст ответа, карточки, профиль голоса и usage. */
export interface ChatReply {
    readonly reply: string;
    /** Вторая часть хода: следующая активность или вопрос; null — ход из одной части. */
    readonly followUp: string | null;
    readonly corrections: readonly ChatCorrection[];
    readonly quiz: ChatQuiz | null;
    readonly vocabWord: ChatVocabWord | null;
    /** План урока: null — сервер его не прислал (старая запись) или форма не разобралась. */
    readonly plan: ChatLessonPlan | null;
    /** Профиль голоса репетитора: null — сервер его не прислал, озвучки не будет. */
    readonly voiceId: string | null;
    readonly usage: ChatUsage;
}

/**
 * План урока для карточки цели: цель, правило и счётчики. Целевых слов в контракте нет — их не отдаёт и
 * сервер, поэтому утечь в текст до конца урока им неоткуда (§16.6).
 */
export interface ChatLessonPlan {
    readonly goal: string;
    readonly rule: string;
    /** Пройдено этапов, 0..total. */
    readonly step: number;
    readonly total: number;
    readonly wordsDone: number;
    readonly wordsTotal: number;
    readonly completed: boolean;
}

/** Тело запроса: ровно два поля контракта POST /api/chat — userId, уровень и квота не отправляются (§16.2). */
export interface ChatRequestInput {
    readonly sessionId: string;
    readonly message: string;
}

export interface ChatStreamHandlers {
    /** Приёмник дельт: текст печатается по мере прихода, а не после завершения потока. */
    readonly onDelta: (text: string) => void;
    /** Отмена: уход со страницы или повторная отправка. */
    readonly signal: AbortSignal;
}

/** Значение SSE-кадра: имя события и склеенные строки data. */
interface SseFrame {
    readonly event: string;
    readonly data: string;
}

const FRAME_SEPARATOR = "\n\n";
// ARCHITECT: наружу уходит только признак обрыва: внутренности шлюза в текст ошибки не попадают (§16.7).
const STREAM_FAILED = "CHAT_STREAM_FAILED";

function streamFailure(): ApiError {
    return new ApiError(500, STREAM_FAILED);
}

function parseJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function parseFrame(raw: string): SseFrame | null {
    let event = "";
    const data: string[] = [];

    for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice("event:".length).trim();
        else if (line.startsWith("data:")) data.push(line.slice("data:".length).trim());
    }

    return event === "" || data.length === 0 ? null : { event, data: data.join("\n") };
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function readString(value: unknown, max: number): string | null {
    return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

/** Необязательная строка карточки: отсутствие поля и пустая строка значат одно — текста нет. */
function readOptionalString(value: unknown, max: number): string | null {
    if (value === undefined) return "";
    return typeof value === "string" && value.length <= max ? value : null;
}

function readCount(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readStringList(value: unknown, max: number, limit: number): string[] | null {
    if (!Array.isArray(value) || value.length > limit) return null;

    const items: string[] = [];

    for (const item of value) {
        const text = readString(item, max);
        if (text === null) return null;
        items.push(text);
    }

    return items;
}

function readCorrection(value: unknown): ChatCorrection | null {
    const record = asRecord(value);
    if (record === null) return null;

    const fragment = readString(record.fragment, 240);
    const rule = readString(record.rule, 240);
    const examples = readStringList(record.examples, 240, 3);

    if (fragment === null || rule === null || examples === null) return null;

    // ARCHITECT: вид правки — недоверенная строка: неизвестное значение считается значимой ошибкой, поэтому
    // подчёркивание и карточка правила не пропадают из-за опечатки модели.
    const kind = record.kind === "polish" ? "polish" : "error";

    return { fragment, rule, examples, kind };
}

function readQuizOptions(value: unknown): ChatQuizOption[] | null {
    if (!Array.isArray(value) || value.length < 2 || value.length > 4) return null;

    const options: ChatQuizOption[] = [];

    for (const item of value) {
        const record = asRecord(item);
        const id = record === null ? null : readString(record.id, 8);
        const text = record === null ? null : readString(record.text, 240);

        if (id === null || text === null) return null;
        options.push({ id, text });
    }

    return options;
}

function readQuiz(value: unknown): ChatQuiz | null {
    const record = asRecord(value);
    if (record === null) return null;

    const prompt = readString(record.prompt, 300);
    if (prompt === null) return null;

    if (record.type === "gap-fill") {
        const answer = readString(record.answer, 120);
        return answer === null ? null : { type: "gap-fill", prompt, answer };
    }

    if (record.type === "choice") {
        const options = readQuizOptions(record.options);
        const answerId = readString(record.answerId, 8);
        if (options === null || answerId === null) return null;
        return { type: "choice", prompt, options, answerId };
    }

    if (record.type === "word-order") {
        const words = readStringList(record.words, 60, 12);
        const answer = readString(record.answer, 300);
        if (words === null || words.length < 2 || answer === null) return null;
        return { type: "word-order", prompt, words, answer };
    }

    return null;
}

function readVocabWord(value: unknown): ChatVocabWord | null {
    const record = asRecord(value);
    if (record === null) return null;

    const term = readString(record.term, 120);
    const translation = readOptionalString(record.translation, 240);
    const context = readOptionalString(record.context, 500);

    if (term === null || translation === null || context === null) return null;

    return { term, translation, context };
}

function readUsage(value: unknown): ChatUsage | null {
    const record = asRecord(value);
    if (record === null) return null;

    const promptTokens = readCount(record.promptTokens);
    const completionTokens = readCount(record.completionTokens);
    const messagesRemaining = readCount(record.messagesRemaining);
    const model = readString(record.model, 120);

    if (promptTokens === null || completionTokens === null || messagesRemaining === null)
        return null;
    if (model === null) return null;

    return { promptTokens, completionTokens, model, messagesRemaining };
}

function readCorrections(value: unknown): ChatCorrection[] | null {
    if (!Array.isArray(value) || value.length > 4) return null;

    const corrections: ChatCorrection[] = [];

    for (const item of value) {
        const correction = readCorrection(item);
        if (correction === null) return null;
        corrections.push(correction);
    }

    return corrections;
}

// ARCHITECT: план — данные сервера, но и их форма проверяется по полям: чужая форма теряет карточку цели, а
// не ломает ленту целиком (§16.8).
function readPlan(value: unknown): ChatLessonPlan | null {
    const record = asRecord(value);
    if (record === null) return null;

    const goal = readString(record.goal, 300);
    const rule = readString(record.rule, 300);
    const step = readCount(record.step);
    const total = readCount(record.total);
    const wordsDone = readCount(record.wordsDone);
    const wordsTotal = readCount(record.wordsTotal);

    if (goal === null || rule === null) return null;
    if (step === null || total === null || wordsDone === null || wordsTotal === null) return null;
    // ARCHITECT: этап за пределами плана и пустой план — испорченные данные: прогресс нельзя показать честно.
    if (total === 0 || step > total || wordsDone > wordsTotal) return null;

    return { goal, rule, step, total, wordsDone, wordsTotal, completed: record.completed === true };
}

/** Разбор события done: чужая форма — null, то есть битый ответ, а не карточки для рендера. */
function readReply(value: unknown): ChatReply | null {
    const record = asRecord(value);
    if (record === null) return null;

    const reply = typeof record.reply === "string" ? record.reply : null;
    const usage = readUsage(record.usage);
    const corrections = readCorrections(record.corrections);
    const quiz = record.quiz === null ? null : readQuiz(record.quiz);
    const vocabWord = record.vocabWord === null ? null : readVocabWord(record.vocabWord);
    // ARCHITECT: вторая часть — best-effort, как карточки: чужая форма значит «второй части нет», а не битый
    // ответ, поэтому текст репетитора остаётся читаемым.
    const followUp =
        typeof record.followUp === "string" && record.followUp.length <= 600 && record.followUp !== ""
            ? record.followUp
            : null;
    // ARCHITECT: профиль голоса необязателен: ответ старого сервера приходит без него — тогда кнопки озвучки
    // нет, а текст реплики остаётся читаемым.
    const voiceId = readOptionalString(record.voiceId, 32);

    if (reply === null || usage === null || corrections === null) return null;
    if (voiceId === null) return null;
    if (record.quiz !== null && quiz === null) return null;
    if (record.vocabWord !== null && vocabWord === null) return null;

    return {
        reply,
        followUp,
        corrections,
        quiz,
        vocabWord,
        plan: record.plan === undefined ? null : readPlan(record.plan),
        voiceId: voiceId === "" ? null : voiceId,
        usage,
    };
}

/** Карточки ответа: правки, квиз и слово урока — ровно те три блока, что уходят событием done. */
export interface ChatCards {
    readonly corrections: readonly ChatCorrection[];
    readonly quiz: ChatQuiz | null;
    readonly vocabWord: ChatVocabWord | null;
}

/** Сообщение истории: роль, текст и карточки ответа (у реплики ученика карточек нет). */
export interface ChatHistoryMessage {
    readonly id: string;
    readonly role: "user" | "assistant";
    readonly content: string;
    readonly cards: ChatCards | null;
    /** Профиль голоса из payload ответа: null — запись без него (сохранена до появления озвучки). */
    readonly voiceId: string | null;
}

// ARCHITECT: payload строки писал наш роутер, но источник карточек — модель, то есть недоверенный вывод (§16.8):
// карточки разбираются теми же читателями, что и событие done. Битые карточки отбрасываются — текст реплики
// важнее, и одна испорченная строка не должна прятать весь диалог.
function readStoredCards(payload: unknown): ChatCards | null {
    const record = asRecord(payload);
    const cards = record === null ? null : asRecord(record.cards);

    if (cards === null) return null;

    const corrections = readCorrections(cards.corrections);

    if (corrections === null) return null;

    const quiz = cards.quiz === null || cards.quiz === undefined ? null : readQuiz(cards.quiz);
    const vocabWord =
        cards.vocabWord === null || cards.vocabWord === undefined
            ? null
            : readVocabWord(cards.vocabWord);

    return { corrections, quiz, vocabWord };
}

// ARCHITECT: профиль голоса лежит в payload рядом с карточками: у записей, сохранённых до появления озвучки,
// поля нет — тогда кнопки у реплики не будет, а текст остаётся читаемым.
function readStoredVoiceId(payload: unknown): string | null {
    const record = asRecord(payload);
    const voiceId = record === null ? null : readOptionalString(record.voiceId, 32);

    return voiceId === null || voiceId === "" ? null : voiceId;
}

/** Строка конверта истории: форма недоверенная, поэтому каждое поле читается отдельно. */
function readHistoryMessage(value: unknown): ChatHistoryMessage | null {
    const record = asRecord(value);

    if (record === null) return null;

    const id = readString(record.id, 64);
    const role = record.role === "user" || record.role === "assistant" ? record.role : null;
    const content = typeof record.content === "string" ? record.content : null;

    if (id === null || role === null || content === null) return null;

    return {
        id,
        role,
        content,
        cards: role === "assistant" ? readStoredCards(record.payload) : null,
        voiceId: role === "assistant" ? readStoredVoiceId(record.payload) : null,
    };
}

/** История сессии: сообщения и план текущего урока (карточка цели над лентой). */
export interface ChatHistory {
    readonly messages: readonly ChatHistoryMessage[];
    readonly plan: ChatLessonPlan | null;
}

// ARCHITECT: история читается cookie-сессией через apiFetch (CSRF GET-у не нужен, 401 обновляется транспортом).
// Чужая и несуществующая сессия отвечают 404: для ленты это «диалог не найден», и хук показывает полосу ошибки.
export async function fetchChatHistory(sessionId: string): Promise<ChatHistory> {
    const { messages, plan } = await apiFetch<{
        readonly messages: readonly unknown[];
        readonly plan?: unknown;
    }>(`/chat/history?sessionId=${encodeURIComponent(sessionId)}`);

    if (!Array.isArray(messages)) throw new ApiError(500, STREAM_FAILED);

    const history: ChatHistoryMessage[] = [];

    for (const message of messages) {
        const read = readHistoryMessage(message);
        if (read === null) continue;
        history.push(read);
    }

    // ARCHITECT: план необязателен: сервер без плана (старая версия) просто не рисует карточку цели.
    return { messages: history, plan: plan === undefined ? null : readPlan(plan) };
}

/**
 * Читает SSE-поток чата до события done: дельты уходят в onDelta, а текст, карточки и usage возвращаются
 * целиком. Обрыв потока, кадр error и битый done одинаково значат неудачу — ApiError: хук удаляет частичный
 * ответ и предлагает повтор (§16.8).
 */
export async function streamChatReply(
    input: ChatRequestInput,
    handlers: ChatStreamHandlers
): Promise<ChatReply> {
    const response = await apiStream("/chat", {
        method: "POST",
        body: input,
        signal: handlers.signal,
    });
    const body = response.body;

    if (body === null) throw streamFailure();

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply: ChatReply | null = null;

    for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;

        buffer += decoder.decode(chunk.value, { stream: true });

        let at = buffer.indexOf(FRAME_SEPARATOR);

        while (at >= 0) {
            const frame = parseFrame(buffer.slice(0, at));
            buffer = buffer.slice(at + FRAME_SEPARATOR.length);
            at = buffer.indexOf(FRAME_SEPARATOR);

            if (frame === null) continue;

            if (frame.event === "delta") {
                const text = asRecord(parseJson(frame.data))?.text;
                if (typeof text === "string" && text !== "") handlers.onDelta(text);
                continue;
            }

            if (frame.event === "done") {
                const parsed = readReply(parseJson(frame.data));
                if (parsed === null) throw streamFailure();
                reply = parsed;
                continue;
            }

            if (frame.event === "error") throw streamFailure();
        }
    }

    // ARCHITECT: поток без события done — обрыв: частичный текст ответом не считается.
    if (reply === null) throw streamFailure();

    return reply;
}
