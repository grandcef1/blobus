// ARCHITECT: разбор SSE-потока чата — единственное место, где недоверенный вывод модели превращается в данные
// для рендера: тесты держат дельты, событие done со всеми типами карточек, битый ответ и обрыв. Сеть не
// поднимается: apiStream подменяется ответом с ReadableStream, поэтому склейка кадров и TextDecoder проверяются
// настоящим кодом (как в server/ai/openrouter.test.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiStreamMock, apiFetchMock } = vi.hoisted(() => ({
    apiStreamMock: vi.fn(),
    apiFetchMock: vi.fn(),
}));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiFetch: apiFetchMock, apiStream: apiStreamMock };
});

const SESSION_ID = "5b1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a11";
const encoder = new TextEncoder();

/** Ответ с потоком: чанки режутся как сеть — по границам, а не по кадрам. */
function streamResponse(chunks: readonly string[]): Response {
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));

            controller.close();
        },
    });

    return new Response(body, { status: 200 });
}

function frame(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const USAGE = { promptTokens: 10, completionTokens: 5, model: "model-x", messagesRemaining: 3 };

const CORRECTION = {
    fragment: "I agree with you.",
    rule: "agree без вспомогательного am",
    examples: ["I agree with you."],
    extra: "лишнее поле отбрасывается",
};

const VOCAB = { term: "deadline", translation: "srok", context: "The deadline is Friday." };

type Reply = Awaited<ReturnType<typeof import("@/api/chat").streamChatReply>>;

async function readReply(
    chunks: readonly string[]
): Promise<{ readonly deltas: readonly string[]; readonly reply: Reply }> {
    apiStreamMock.mockResolvedValue(streamResponse(chunks));

    const { streamChatReply } = await import("@/api/chat");
    const deltas: string[] = [];
    const reply = await streamChatReply(
        { sessionId: SESSION_ID, message: "Hi" },
        { signal: new AbortController().signal, onDelta: (text) => deltas.push(text) }
    );

    return { deltas, reply };
}

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    apiStreamMock.mockReset();
    apiFetchMock.mockReset();
    vi.restoreAllMocks();
});

describe("streamChatReply", () => {
    it("2.1 читает дельты и событие done, отправляя ровно два поля контракта", async () => {
        const { deltas, reply } = await readReply([
            frame("delta", { text: "Good " }),
            frame("delta", { text: "start." }),
            frame("done", {
                reply: "Good start.",
                corrections: [CORRECTION],
                quiz: { type: "gap-fill", prompt: "No ___ needed.", answer: "am" },
                vocabWord: VOCAB,
                voiceId: "en-US-female",
                usage: USAGE,
            }),
        ]);

        expect(deltas).toEqual(["Good ", "start."]);
        expect(reply.reply).toBe("Good start.");
        // ARCHITECT: профиль голоса читается из того же события, что и карточки: клиент озвучивает реплику
        // голосом каталога, а не выбранным на клиенте.
        expect(reply.voiceId).toBe("en-US-female");
        expect(reply.corrections).toHaveLength(1);
        expect(reply.corrections[0]?.fragment).toBe("I agree with you.");
        expect(reply.quiz).toEqual({ type: "gap-fill", prompt: "No ___ needed.", answer: "am" });
        expect(reply.vocabWord?.term).toBe("deadline");
        expect(reply.usage.messagesRemaining).toBe(3);
        expect(apiStreamMock).toHaveBeenCalledWith("/chat", {
            method: "POST",
            body: { sessionId: SESSION_ID, message: "Hi" },
            signal: expect.anything(),
        });
    });

    it("2.1.1 передаёт выбор викторины в теле запроса", async () => {
        apiStreamMock.mockResolvedValue(
            streamResponse([
                frame("done", {
                    reply: "Hi",
                    corrections: [],
                    quiz: null,
                    vocabWord: null,
                    usage: USAGE,
                }),
            ])
        );

        const { streamChatReply } = await import("@/api/chat");

        await streamChatReply(
            { sessionId: SESSION_ID, message: "Hi", quizAnswer: "b" },
            { signal: new AbortController().signal, onDelta: () => undefined }
        );

        // ARCHITECT: выбор викторины уходит полем тела: верность сверяет сервер по своей карточке (§16.2).
        expect(apiStreamMock).toHaveBeenCalledWith("/chat", {
            method: "POST",
            body: { sessionId: SESSION_ID, message: "Hi", quizAnswer: "b" },
            signal: expect.anything(),
        });
    });

    it("2.2 держит кадр, разрезанный на два чанка", async () => {
        const done =
            'event: done\ndata: {"reply":"Hello","corrections":[],"quiz":null,"vocabWord":null,"usage":' +
            JSON.stringify(USAGE) +
            "}\n\n";
        const { deltas, reply } = await readReply([
            'event: delta\ndata: {"text":"Hel',
            `lo"}\n\n${done}`,
        ]);

        expect(deltas).toEqual(["Hello"]);
        expect(reply.reply).toBe("Hello");
        expect(reply.corrections).toEqual([]);
        expect(reply.quiz).toBeNull();
    });

    it("2.3 разбирает choice и word-order, отбрасывая лишние поля карточек", async () => {
        const choice = await readReply([
            frame("done", {
                reply: "Pick one.",
                corrections: [],
                quiz: {
                    type: "choice",
                    prompt: "Pick:",
                    options: [
                        { id: "a", text: "resolve" },
                        { id: "b", text: "get by" },
                    ],
                    answerId: "a",
                    explanation: "лишнее поле",
                },
                vocabWord: null,
                usage: USAGE,
            }),
        ]);

        expect(choice.reply.quiz).toEqual({
            type: "choice",
            prompt: "Pick:",
            options: [
                { id: "a", text: "resolve" },
                { id: "b", text: "get by" },
            ],
            answerId: "a",
        });

        const order = await readReply([
            frame("done", {
                reply: "Build it.",
                corrections: [CORRECTION],
                quiz: {
                    type: "word-order",
                    prompt: "Build:",
                    words: ["I", "am", "here"],
                    answer: "I am here",
                },
                vocabWord: VOCAB,
                usage: USAGE,
            }),
        ]);

        expect(order.reply.quiz).toEqual({
            type: "word-order",
            prompt: "Build:",
            words: ["I", "am", "here"],
            answer: "I am here",
        });
        expect(order.reply.corrections[0]?.examples).toEqual(["I agree with you."]);
    });

    it("2.4 чужая форма done — обрыв, а не данные для рендера", async () => {
        const wrongQuiz = readReply([
            frame("done", {
                reply: "Text.",
                corrections: [],
                quiz: { type: "cloze", prompt: "?", answer: "x" },
                vocabWord: null,
                usage: USAGE,
            }),
        ]);

        await expect(wrongQuiz).rejects.toThrow("CHAT_STREAM_FAILED");

        const wrongCards = readReply([
            frame("done", {
                reply: "Text.",
                corrections: [{ fragment: 5 }],
                quiz: null,
                vocabWord: null,
                usage: USAGE,
            }),
        ]);

        await expect(wrongCards).rejects.toThrow("CHAT_STREAM_FAILED");

        const wrongUsage = readReply([
            frame("done", {
                reply: "Text.",
                corrections: [],
                quiz: null,
                vocabWord: null,
                usage: { ...USAGE, messagesRemaining: "много" },
            }),
        ]);

        await expect(wrongUsage).rejects.toThrow("CHAT_STREAM_FAILED");
    });

    it("2.5 поток без done и кадр error — обрыв", async () => {
        await expect(readReply([frame("delta", { text: "Half an answer" })])).rejects.toThrow(
            "CHAT_STREAM_FAILED"
        );

        await expect(readReply([frame("error", { code: "INTERNAL" })])).rejects.toThrow(
            "CHAT_STREAM_FAILED"
        );
    });

    it("2.6 fetchChatHistory читает конверт и берёт карточки из payload ответа", async () => {
        apiFetchMock.mockResolvedValue({
            messages: [
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a01",
                    role: "user",
                    content: "Hi",
                    payload: {},
                },
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a02",
                    role: "assistant",
                    content: "Hello",
                    payload: {
                        cards: { corrections: [CORRECTION], quiz: null, vocabWord: VOCAB },
                        usage: { model: "model-x" },
                        voiceId: "en-GB-male",
                    },
                },
            ],
        });

        const { fetchChatHistory } = await import("@/api/chat");
        const { messages, plan } = await fetchChatHistory(SESSION_ID);

        expect(apiFetchMock).toHaveBeenCalledWith(`/chat/history?sessionId=${SESSION_ID}`);
        expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
        expect(messages[0]?.cards).toBeNull();
        // ARCHITECT: реплика ученика озвучки не имеет, а профиль голоса ответа читается из payload.
        expect(messages[0]?.voiceId).toBeNull();
        expect(messages[1]?.voiceId).toBe("en-GB-male");
        expect(messages[1]?.cards?.corrections).toHaveLength(1);
        expect(messages[1]?.cards?.vocabWord?.term).toBe("deadline");
        expect(messages[1]?.cards?.quiz).toBeNull();
        // ARCHITECT: конверт без плана — не ошибка: карточка цели просто не рисуется.
        expect(plan).toBeNull();
    });

    it("2.7 чужая роль отбрасывается, битые карточки не мешают тексту реплики", async () => {
        apiFetchMock.mockResolvedValue({
            messages: [
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a01",
                    role: "system",
                    content: "x",
                    payload: {},
                },
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a02",
                    role: "assistant",
                    content: "Hello",
                    payload: { cards: { corrections: "битая форма", quiz: null, vocabWord: null } },
                },
                {
                    id: "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a03",
                    role: "user",
                    content: "Hi",
                    payload: {},
                },
            ],
        });

        const { fetchChatHistory } = await import("@/api/chat");
        const { messages } = await fetchChatHistory(SESSION_ID);

        // ARCHITECT: строка с чужой ролью не показывается вовсе, а испорченные карточки не прячут ответ.
        expect(messages.map((message) => message.id)).toEqual([
            "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a02",
            "5c1f8d42-1a3e-4b7c-9f2a-6d0e3b8c4a03",
        ]);
        expect(messages[0]?.content).toBe("Hello");
        expect(messages[0]?.cards).toBeNull();
        // ARCHITECT: запись без профиля голоса — не ошибка: реплика читается текстом, кнопки просто нет.
        expect(messages[0]?.voiceId).toBeNull();
    });

    it("2.8 конверт без списка сообщений — ошибка чтения истории", async () => {
        apiFetchMock.mockResolvedValue({ messages: null });

        const { fetchChatHistory } = await import("@/api/chat");

        await expect(fetchChatHistory(SESSION_ID)).rejects.toThrow("CHAT_STREAM_FAILED");
    });

    it("2.9 вид правки: polish проходит, неизвестное значение считается ошибкой", async () => {
        const { reply } = await readReply([
            frame("done", {
                reply: "Text.",
                corrections: [
                    { fragment: "Im", rule: "I'm", examples: [], kind: "polish" },
                    { fragment: "go", rule: "went", examples: [], kind: "нечто" },
                ],
                quiz: null,
                vocabWord: null,
                usage: USAGE,
            }),
        ]);

        // ARCHITECT: неизвестный вид правки читается как значимая ошибка: подчёркивание и карточка правила
        // не должны пропадать из-за опечатки модели.
        expect(reply.corrections[0]?.kind).toBe("polish");
        expect(reply.corrections[1]?.kind).toBe("error");
    });

    it("2.10 читает вторую часть хода и план урока, битая форма их теряет без потери ответа", async () => {
        const { reply } = await readReply([
            frame("done", {
                reply: "Text.",
                followUp: "Now make it a question.",
                corrections: [],
                quiz: null,
                vocabWord: null,
                plan: {
                    goal: "speak more freely in everyday conversation in two or three connected sentences.",
                    rule: "Present Simple for habits and routines",
                    step: 0,
                    total: 6,
                    wordsDone: 1,
                    wordsTotal: 5,
                    completed: false,
                },
                usage: USAGE,
            }),
        ]);

        expect(reply.followUp).toBe("Now make it a question.");
        expect(reply.plan?.rule).toBe("Present Simple for habits and routines");
        expect(reply.plan?.total).toBe(6);
        expect(reply.plan?.wordsTotal).toBe(5);
        // ARCHITECT: целевых слов в контракте нет: сервер их не отдаёт, поэтому в DTO их и быть не может.
        expect(Object.keys(reply.plan ?? {})).not.toContain("targetWords");

        const broken = await readReply([
            frame("done", {
                reply: "Text.",
                followUp: 42,
                corrections: [],
                quiz: null,
                vocabWord: null,
                // ARCHITECT: этап за пределами плана — испорченные данные: карточка цели не рисуется, а текст
                // репетитора остаётся.
                plan: { goal: "x", rule: "y", step: 9, total: 6, wordsDone: 0, wordsTotal: 5 },
                usage: USAGE,
            }),
        ]);

        expect(broken.reply.reply).toBe("Text.");
        expect(broken.reply.followUp).toBeNull();
        expect(broken.reply.plan).toBeNull();

        // ARCHITECT: ответ старого сервера без обеих частей тоже валиден: ход из одного сообщения.
        const legacy = await readReply([
            frame("done", {
                reply: "Text.",
                corrections: [],
                quiz: null,
                vocabWord: null,
                usage: USAGE,
            }),
        ]);

        expect(legacy.reply.followUp).toBeNull();
        expect(legacy.reply.plan).toBeNull();
    });
});
