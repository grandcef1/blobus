// ARCHITECT: разбор SSE-потока чата — единственное место, где недоверенный вывод модели превращается в данные
// для рендера: тесты держат дельты, событие done со всеми типами карточек, битый ответ и обрыв. Сеть не
// поднимается: apiStream подменяется ответом с ReadableStream, поэтому склейка кадров и TextDecoder проверяются
// настоящим кодом (как в server/ai/openrouter.test.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiStreamMock } = vi.hoisted(() => ({ apiStreamMock: vi.fn() }));

vi.mock("@/api/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/client")>();
    return { ...actual, apiStream: apiStreamMock };
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
                usage: USAGE,
            }),
        ]);

        expect(deltas).toEqual(["Good ", "start."]);
        expect(reply.reply).toBe("Good start.");
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
});
