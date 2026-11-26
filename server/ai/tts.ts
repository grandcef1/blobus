// ARCHITECT: транспорт синтеза речи OpenRouter: ключ остаётся в замыкании клиента, модель и голос берутся из
// allowlist, а текст в лог не попадает — в строку расхода идут только профиль голоса, длина и длительность
// (§16.3, §16.11).
// ARCHITECT: сеть в тестах не поднимается: tts.test.ts подменяет fetch и вызывает этот модуль как есть.
import type { VoiceId } from "../tutorCatalog.ts";

// ARCHITECT: единственная разрешённая модель синтеза: смена провайдера — правка этой строки, а не запроса
// клиента. Возможность проверена запросом к /api/v1/audio/speech (hexgrad/kokoro-82m, response_format=mp3).
export const TTS_MODEL = "hexgrad/kokoro-82m";

// ARCHITECT: профиль голоса каталога → голос конкретной модели. Карта лежит рядом с моделью, потому что это
// данные провайдера, а не персонажа; allowlist голосов задаётся схемой тела запроса.
export const TTS_VOICE_BY_ID: Record<VoiceId, string> = {
    "en-US-female": "af_heart",
    "en-US-male": "am_michael",
    "en-GB-female": "bf_emma",
    "en-GB-male": "bm_george",
};

const TTS_URL = "https://openrouter.ai/api/v1/audio/speech";
const REQUEST_TIMEOUT_MS = 20_000;
/** Та же граница, что у схемы тела запроса (server/routes/tts.ts): обрезка — защита от вставки. */
const TEXT_MAX_CHARS = 600;

export interface TtsAudio {
    readonly bytes: Uint8Array;
    readonly mimeType: string;
}

export interface TtsInput {
    readonly text: string;
    /** Профиль голоса каталога: имя голоса провайдера выбирает этот модуль. */
    readonly voiceId: VoiceId;
    /** Отмена со стороны запроса: обрыв клиента. */
    readonly signal?: AbortSignal;
}

export interface TtsClient {
    synthesize(input: TtsInput): Promise<TtsAudio>;
}

/** Клиент синтеза: ключ замыкается здесь и наружу не выходит. */
export function createTtsClient(options: { readonly apiKey: string }): TtsClient {
    const { apiKey } = options;

    return {
        async synthesize(input) {
            const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
            const signal =
                input.signal === undefined ? timeout : AbortSignal.any([input.signal, timeout]);
            const started = Date.now();
            const response = await fetch(TTS_URL, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${apiKey}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: TTS_MODEL,
                    input: input.text.slice(0, TEXT_MAX_CHARS),
                    voice: TTS_VOICE_BY_ID[input.voiceId],
                    response_format: "mp3",
                }),
                signal,
            });

            // ARCHITECT: тело и статус отказа провайдера наружу не уходят: в ошибку попадает только код (§16.7).
            if (!response.ok) throw new Error(`TTS_HTTP_${response.status}`);

            const mimeType = response.headers.get("content-type") ?? "";
            const bytes = new Uint8Array(await response.arrayBuffer());

            // ARCHITECT: пустое тело и не-аудио ответ — отказ, а не тишина: клиент деградирует в текст.
            if (!mimeType.startsWith("audio/") || bytes.byteLength === 0)
                throw new Error("TTS_EMPTY_AUDIO");

            console.log(
                JSON.stringify({
                    level: "info",
                    msg: "tts.synthesis",
                    voiceId: input.voiceId,
                    chars: input.text.length,
                    ms: Date.now() - started,
                })
            );

            return { bytes, mimeType };
        },
    };
}
