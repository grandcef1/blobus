// ARCHITECT: транспорт стриминга OpenRouter: ключ только серверный и в логи не попадает, модели берутся из
// allowlist, провайдер прибит к дешёвому пулу, reasoning выключен (§16.3, §16.8). Ключ живёт в замыкании
// клиента, поэтому ни в сообщения об ошибках, ни в логи он не попадает.
// ARCHITECT: сеть в тестах не поднимается: chat.test.ts подменяет fetch и вызывает этот модуль как есть —
// поэтому стриминг, обрезка маркера и фолбэк проверяются настоящим кодом, а не заглушкой.
import { z } from "zod";

import { CARDS_MARKER, splitCards } from "../chat/contract.ts";
import type { ChatHistoryMessage } from "../chat/prompt.ts";

// ARCHITECT: primary -> fallback -> резерв, порядок и есть политика фолбэка. Google/Gemini в allowlist нет,
// а allow_fallbacks: false не даёт провайдеру подставить модель другого семейства.
export const MODEL_ALLOWLIST = [
    "deepseek/deepseek-v4.1-flash",
    "qwen/qwen3-30b-a3b-instruct-2507",
    "deepseek/deepseek-v4.1-flash-1017",
] as const;

/** Дешёвый пул провайдера: заказ уходит только DeepInfra, автоподбор другого провайдера выключен. */
const PROVIDER_ORDER = ["DeepInfra"] as const;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;
// ARCHITECT: 600 токенов на 2–4 предложения и карточки: верхняя граница коридора 500–700 из ТЗ, ниже
// которой карточки начинают обрезаться.
const MAX_TOKENS = 600;
// ARCHITECT: столько символов держим в буфере, пока маркер не найден: иначе клиент получил бы в delta
// половину маркера и JSON карточек вместо текста ответа.
const HOLD_BACK = CARDS_MARKER.length - 1;

// ARCHITECT: чанк провайдера — недоверенные данные: неизвестные поля отбрасываются, а неверный тип
// приводит к пропуску чанка, а не к падению стрима (§16.6).
const ChunkSchema = z.object({
    choices: z
        .array(z.object({ delta: z.object({ content: z.string().optional() }).optional() }))
        .optional(),
    usage: z
        .object({
            prompt_tokens: z.number().int().min(0).optional(),
            completion_tokens: z.number().int().min(0).optional(),
        })
        .nullable()
        .optional(),
});

export interface AiUsage {
    readonly promptTokens: number;
    readonly completionTokens: number;
}

export interface AiReply {
    /** Текст ответа без маркера и карточек. */
    readonly text: string;
    /** Сырой JSON карточек: форму проверяет роутер (contract.ts) — битый ответ не сохраняется. */
    readonly cardsJson: string | null;
    readonly usage: AiUsage;
    readonly model: string;
}

export interface AiStreamInput {
    readonly systemPrompt: string;
    readonly history: readonly ChatHistoryMessage[];
    readonly message: string;
    /** Отмена со стороны запроса: обрыв клиента или остановка сервера. */
    readonly signal?: AbortSignal;
}

/** Приёмник дельт: роутер пишет их в SSE сразу, не дожидаясь конца ответа. */
export type DeltaSink = (text: string) => void;

export interface AiClient {
    streamReply(input: AiStreamInput, onDelta: DeltaSink): Promise<AiReply>;
}

/** JSON чанка или null: мусорные строки стрима (keep-alive, обрезанные кадры) просто пропускаются. */
function parseJson(payload: string): unknown {
    try {
        return JSON.parse(payload);
    } catch {
        return null;
    }
}
/** Один заказ провайдеру: чтение SSE-потока, удержание маркера и сборка usage. */
async function streamOnce(
    apiKey: string,
    model: string,
    input: AiStreamInput,
    onDelta: DeltaSink,
    emitted: { value: number }
): Promise<AiReply> {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = input.signal === undefined ? timeout : AbortSignal.any([input.signal, timeout]);
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model,
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: MAX_TOKENS,
            reasoning: { enabled: false },
            provider: { order: [...PROVIDER_ORDER], allow_fallbacks: false },
            messages: [
                { role: "system", content: input.systemPrompt },
                ...input.history,
                { role: "user", content: input.message },
            ],
        }),
        signal,
    });

    // ARCHITECT: тело и статус отказа провайдера наружу не уходят: в ошибку попадает только код, иначе
    // внутренности шлюза утекли бы в ответ (§16.7).
    if (!response.ok || response.body === null) {
        throw new Error(`OPENROUTER_HTTP_${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    let pending = "";
    let markerAt = -1;
    let usage: AiUsage = { promptTokens: 0, completionTokens: 0 };

    // ARCHITECT: дельты идут только по тексту ответа: пока маркер не найден, хвост длиной маркера
    // удерживается, а с появлением маркера стрим текста закрывается на его позиции.
    function absorb(text: string): void {
        raw += text;

        if (markerAt < 0) markerAt = raw.indexOf(CARDS_MARKER);

        if (markerAt >= 0) {
            if (markerAt > emitted.value) {
                onDelta(raw.slice(emitted.value, markerAt));
                emitted.value = markerAt;
            }

            return;
        }

        const limit = Math.max(0, raw.length - HOLD_BACK);

        if (limit > emitted.value) {
            onDelta(raw.slice(emitted.value, limit));
            emitted.value = limit;
        }
    }

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        pending += decoder.decode(value, { stream: true });

        const lines = pending.split("\n");
        pending = lines.pop() ?? "";

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice("data:".length).trim();

            if (payload === "[DONE]") continue;

            const chunk = ChunkSchema.safeParse(parseJson(payload));

            if (!chunk.success) continue;

            const content = chunk.data.choices?.[0]?.delta?.content;

            if (typeof content === "string" && content.length > 0) absorb(content);

            if (chunk.data.usage !== null && chunk.data.usage !== undefined) {
                usage = {
                    promptTokens: chunk.data.usage.prompt_tokens ?? usage.promptTokens,
                    completionTokens: chunk.data.usage.completion_tokens ?? usage.completionTokens,
                };
            }
        }
    }

    // ARCHITECT: хвост удержания отдаётся только если маркера не было: иначе это карточки, а не текст.
    if (markerAt < 0 && raw.length > emitted.value) {
        onDelta(raw.slice(emitted.value));
        emitted.value = raw.length;
    }

    const { text, cardsJson } = splitCards(raw);

    return { text, cardsJson, usage, model };
}

/** Клиент чата: ключ замыкается здесь и наружу не выходит. */
export function createOpenRouterClient(options: { readonly apiKey: string }): AiClient {
    const { apiKey } = options;

    return {
        async streamReply(input, onDelta) {
            let lastError: unknown = null;

            for (const model of MODEL_ALLOWLIST) {
                const emitted = { value: 0 };

                try {
                    const started = Date.now();
                    const reply = await streamOnce(apiKey, model, input, onDelta, emitted);

                    // ARCHITECT: строка о расходе без PII и без текста сообщения: только модель, токены и
                    // длительность (§16.11).
                    console.log(
                        JSON.stringify({
                            level: "info",
                            msg: "chat.completion",
                            model: reply.model,
                            promptTokens: reply.usage.promptTokens,
                            completionTokens: reply.usage.completionTokens,
                            ms: Date.now() - started,
                        })
                    );

                    return reply;
                } catch (error) {
                    lastError = error;

                    // ARCHITECT: отмена и уже отправленный текст фолбэк запрещают: второй ответ склеился бы
                    // у клиента с первым.
                    if (input.signal?.aborted === true || emitted.value > 0) throw error;
                }
            }

            throw lastError ?? new Error("OPENROUTER_NO_MODEL");
        },
    };
}
