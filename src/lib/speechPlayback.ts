// ARCHITECT: озвучка репетитора в браузере: голос выбирается по профилю voiceId из каталога, а не по имени
// голоса провайдера. Подходящего голоса нет — реплика остаётся текстом, ошибки нет.
// ARCHITECT: воспроизведение одно на страницу, поэтому состояние живёт в модуле, а компонент подписывается на
// него через useSyncExternalStore: соседняя кнопка не показывает «играет» и не гасит чужой звук.

const SPEECH_RATE = 0.95;

/** Профиль голоса на клиенте: язык и пол — то же, что объявляет каталог (server/tutorCatalog.ts). */
interface BrowserVoiceProfile {
    readonly language: string;
    readonly gender: VoiceGender;
}

/** Пол голоса: строка совпадает с полем gender каталога. */
type VoiceGender = "female" | "male";

// ARCHITECT: язык и пол берутся из профиля voiceId ("<язык>-<пол>"): строка пришла с сервера, а каталог
// объявляет те же два измерения отдельными полями.
export const BROWSER_VOICE_PROFILES: Record<string, BrowserVoiceProfile> = {
    "en-US-female": { language: "en-US", gender: "female" },
    "en-US-male": { language: "en-US", gender: "male" },
    "en-GB-female": { language: "en-GB", gender: "female" },
    "en-GB-male": { language: "en-GB", gender: "male" },
};

// ARCHITECT: пол браузерного голоса угадывается по имени: у Chrome и Windows в нём есть готовые слова
// (Female/Male, Zira/David), у Apple — имена людей. Это подсказка для подбора, а не гарантия тембра: если
// голоса нужного пола нет, берётся любой голос того же языка.
const FEMALE_HINTS = [
    "female",
    "zira",
    "samantha",
    "victoria",
    "karen",
    "moira",
    "tessa",
    "fiona",
    "milena",
    "monica",
    "paulina",
];

const MALE_HINTS = [
    "male",
    "david",
    "mark",
    "daniel",
    "alex",
    "fred",
    "george",
    "james",
    "tom",
    "jorge",
    "diego",
];

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

// ARCHITECT: порядок подбора: точный язык, затем голос нужного пола, затем любой голос того же языка. Точное
// совпадение акцента важнее тембра, но реплику без голоса не оставляем, поэтому fallback есть всегда.
function pickVoice(
    voices: readonly SpeechSynthesisVoice[],
    profile: BrowserVoiceProfile
): SpeechSynthesisVoice | null {
    const exact = voices.filter((voice) => voice.lang === profile.language);
    const code = profile.language.split("-")[0] ?? profile.language;
    const candidates =
        exact.length > 0 ? exact : voices.filter((voice) => voice.lang.startsWith(code));

    if (candidates.length === 0) return null;

    const hints = profile.gender === "female" ? FEMALE_HINTS : MALE_HINTS;
    const byGender = candidates.find((voice) => {
        const name = voice.name.toLowerCase();

        return hints.some((hint) => name.includes(hint));
    });

    return byGender ?? candidates[0] ?? null;
}

/** Читает текст голосом профиля. false — подходящего голоса нет: озвучки не будет, ошибки тоже. */
export function playBrowserSpeech(id: string, text: string, voiceId: string): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

    const profile = BROWSER_VOICE_PROFILES[voiceId];

    if (profile === undefined) return false;

    const synthesis = window.speechSynthesis;
    const voice = pickVoice(synthesis.getVoices(), profile);

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
