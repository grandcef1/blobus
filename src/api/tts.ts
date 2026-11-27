// ARCHITECT: транспорт платной озвучки: запрос идёт через apiFetch (cookie-сессия, CSRF, 401→refresh, конверт
// ошибок), поэтому модуль не дёргает fetch сам (§16.13). Сервер отвечает mp3 в base64 — здесь собирается data
// URL, с которым работает Audio, отдельный блоб не нужен.
// ARCHITECT: текст чистится до запроса: провайдер читает «underscore» и markdown-символы так же, как браузерный
// синтезатор, поэтому пропуски и разметка убираются на обеих ветках озвучки (§спец. 6).
import { ApiError, apiFetch } from "@/api/client";
import { cleanForSpeech } from "@/lib/speechPlayback";

const AUDIO_MIME_PREFIX = "audio/";
const TTS_FAILED = "TTS_FAILED";

/** Конверт ответа POST /api/tts (server/routes/tts.ts): аудио и его тип. */
interface TtsEnvelope {
    audio: string;
    mimeType: string;
}

/** Синтез речи: отказ сервера и провайдера — ApiError, клиент деградирует в текстовую реплику. */
export async function fetchTtsAudio(text: string, voiceId: string): Promise<string> {
    const envelope = await apiFetch<TtsEnvelope>("/tts", {
        method: "POST",
        body: { text: cleanForSpeech(text), voiceId },
    });

    const audio = typeof envelope.audio === "string" ? envelope.audio : "";
    const mimeType = typeof envelope.mimeType === "string" ? envelope.mimeType : "";

    // ARCHITECT: форма ответа недоверенная: чужой mimeType и пустое аудио — обрыв, а не тишина в плеере.
    if (audio === "" || !mimeType.startsWith(AUDIO_MIME_PREFIX))
        throw new ApiError(500, TTS_FAILED);

    return `data:${mimeType};base64,${audio}`;
}
