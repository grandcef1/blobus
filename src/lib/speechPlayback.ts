// ARCHITECT: озвучка репетитора в браузере: голос выбирается по профилю voiceId из каталога, а не по имени
// голоса провайдера. Подходящего голоса нет — реплика остаётся текстом, ошибки нет.
// ARCHITECT: воспроизведение одно на страницу, поэтому состояние живёт в модуле, а компонент подписывается на
// него через useSyncExternalStore: соседняя кнопка не показывает «играет» и не гасит чужой звук.

const SPEECH_RATE = 0.95;

// ARCHITECT: язык берётся из профиля каталога: тембр браузеру не задать (голос выбирает система), поэтому
// подбор идёт по языку — этого хватает, чтобы акцент репетитора не смешивался между репликами.
export const BROWSER_LANGUAGE_BY_VOICE: Record<string, string> = {
    "en-US-female": "en-US",
    "en-US-male": "en-US",
    "en-GB-female": "en-GB",
    "en-GB-male": "en-GB",
};

interface Playback {
    readonly id: string;
    readonly stop: () => void;
}

let playing: Playback | null = null;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) listener();
}

/** Подписка для useSyncExternalStore: одна на все кнопки озвучки. */
export function subscribePlayback(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** Идентификатор звучащей реплики: null — тишина. */
export function getPlayingId(): string | null {
    return playing === null ? null : playing.id;
}

function begin(next: Playback): void {
    playing?.stop();
    playing = next;
    emit();
}

function finish(id: string): void {
    if (playing?.id !== id) return;

    playing = null;
    emit();
}

/** Снимает текущую озвучку: звук не должен продолжаться поверх следующего экрана. */
export function stopPlayback(): void {
    const current = playing;

    playing = null;
    current?.stop();

    if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();

    if (current !== null) emit();
}

// ARCHITECT: точное совпадение языка важнее запасного английского: акцент репетитора сохраняется, но совсем
// без голоса реплику не оставляем — иначе кнопка молчала бы на системе с одним en-голосом.
function pickVoice(
    voices: readonly SpeechSynthesisVoice[],
    language: string
): SpeechSynthesisVoice | null {
    const exact = voices.find((voice) => voice.lang === language);

    if (exact !== undefined) return exact;

    const code = language.split("-")[0] ?? language;

    return voices.find((voice) => voice.lang.startsWith(code)) ?? null;
}

/** Читает текст голосом профиля. false — подходящего голоса нет: озвучки не будет, ошибки тоже. */
export function playBrowserSpeech(id: string, text: string, voiceId: string): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

    const language = BROWSER_LANGUAGE_BY_VOICE[voiceId];

    if (language === undefined) return false;

    const synthesis = window.speechSynthesis;
    const voice = pickVoice(synthesis.getVoices(), language);

    if (voice === null) return false;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = SPEECH_RATE;
    utterance.onend = () => finish(id);
    utterance.onerror = () => finish(id);

    stopPlayback();
    begin({ id, stop: () => synthesis.cancel() });
    synthesis.speak(utterance);

    return true;
}

/** Играет готовое аудио платного синтеза (mp3 в data URL). */
export function playEncodedAudio(id: string, source: string): void {
    const audio = new Audio(source);
    audio.onended = () => finish(id);
    audio.onerror = () => finish(id);

    stopPlayback();
    begin({ id, stop: () => audio.pause() });
    // ARCHITECT: play() отдаёт промис только в браузерах, Promise.resolve приводит оба случая к одному.
    void Promise.resolve(audio.play()).catch(() => finish(id));
}
