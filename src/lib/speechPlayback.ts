// ARCHITECT: озвучка репетитора в браузере: голос выбирается по профилю voiceId из каталога, а не по имени
// голоса провайдера. Подходящего голоса нет — реплика остаётся текстом, ошибки нет.
// ARCHITECT: текст читается сегментами по письменности: кириллица идёт русским голосом, латиница — голосом
// профиля. Пол репетитора сохраняется на всех языках. Языка нет в браузере — сегмент пропускается молча.
// ARCHITECT: воспроизведение одно на страницу, поэтому состояние живёт в модуле, а компонент подписывается на
// него через useSyncExternalStore: соседняя кнопка не показывает «играет» и не гасит чужой звук.

const SPEECH_RATE = 0.95;
/** Язык кириллических сегментов: объяснения репетитора перемешаны с английскими фразами одной репликой. */
const CYRILLIC_LANGUAGE = "ru-RU";

/** Профиль голоса на клиенте: язык и пол — то же, что объявляет каталог (server/tutorCatalog.ts). */
interface BrowserVoiceProfile {
    readonly language: string;
    readonly gender: VoiceGender;
}

/** Пол голоса: строка совпадает с полем gender каталога. */
type VoiceGender = "female" | "male";

/** Письменность сегмента: по ней выбирается язык озвучки. «other» — цифры и знаки. */
export type SpeechScript = "latin" | "cyrillic" | "other";

/** Сегмент реплики: читается одним голосом. */
export interface SpeechSegment {
    readonly text: string;
    readonly script: SpeechScript;
}

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

// ARCHITECT: порядок подбора: точный язык, затем любой голос того же языка (акцент важнее тембра), внутри языка —
// голос нужного пола. Подходящего языка нет вовсе — null: сегмент пропускается молча.
function pickVoice(
    voices: readonly SpeechSynthesisVoice[],
    language: string,
    gender: VoiceGender
): SpeechSynthesisVoice | null {
    const exact = voices.filter((voice) => voice.lang === language);
    const code = language.split("-")[0] ?? language;
    const candidates =
        exact.length > 0 ? exact : voices.filter((voice) => voice.lang.startsWith(code));

    if (candidates.length === 0) return null;

    const hints = gender === "female" ? FEMALE_HINTS : MALE_HINTS;
    const byGender = candidates.find((voice) => {
        const name = voice.name.toLowerCase();

        return hints.some((hint) => name.includes(hint));
    });

    return byGender ?? candidates[0] ?? null;
}

const CYRILLIC_PATTERN = /\p{Script=Cyrillic}/u;
const LATIN_PATTERN = /\p{Script=Latin}/u;

/** Письменность одного символа: цифры, пробелы и знаки — «other», их язык задаёт соседняя буква. */
function scriptOf(character: string): SpeechScript {
    if (CYRILLIC_PATTERN.test(character)) return "cyrillic";
    if (LATIN_PATTERN.test(character)) return "latin";

    return "other";
}

/**
 * Режет реплику на сегменты по письменности: знаки и цифры прилипают к соседним буквам, а не читаются отдельно.
 * Текст без букв (например «42») остаётся одним сегментом «other» — его читает голос профиля.
 */
export function splitIntoSpeechSegments(text: string): SpeechSegment[] {
    const segments: SpeechSegment[] = [];
    let current: { script: SpeechScript; text: string } | null = null;
    let detached = "";

    for (const character of text) {
        const script = scriptOf(character);

        if (script === "other") {
            if (current === null) detached += character;
            else current.text += character;

            continue;
        }

        if (current === null) current = { script, text: detached + character };
        else if (current.script === script) current.text += character;
        else {
            segments.push({ script: current.script, text: current.text });
            current = { script, text: character };
        }

        detached = "";
    }

    if (current !== null) segments.push({ script: current.script, text: current.text });
    else if (detached !== "") segments.push({ script: "other", text: detached });

    return segments;
}

/** Язык сегмента: кириллица читается русским голосом, латиница и цифры — голосом профиля. */
function languageFor(script: SpeechScript, profile: BrowserVoiceProfile): string {
    return script === "cyrillic" ? CYRILLIC_LANGUAGE : profile.language;
}

interface ScheduledUtterance {
    readonly text: string;
    readonly voice: SpeechSynthesisVoice;
}

/** Очередь озвучки: сегменты в порядке текста; язык без голоса в браузере — пропуск молча. */
function buildQueue(
    text: string,
    voices: readonly SpeechSynthesisVoice[],
    profile: BrowserVoiceProfile
): ScheduledUtterance[] {
    const queue: ScheduledUtterance[] = [];

    for (const segment of splitIntoSpeechSegments(text)) {
        const voice = pickVoice(voices, languageFor(segment.script, profile), profile.gender);

        if (voice === null) continue;

        queue.push({ text: segment.text, voice });
    }

    return queue;
}

/**
 * Читает текст сегментами в порядке текста. false — ни одного сегмента озвучить нечем: тишина без ошибки.
 * Остановка (stopPlayback или новая реплика) очищает очередь: следующий сегмент уже не начнётся.
 */
export function playBrowserSpeech(id: string, text: string, voiceId: string): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

    const profile = BROWSER_VOICE_PROFILES[voiceId];

    if (profile === undefined) return false;

    const synthesis = window.speechSynthesis;
    const queue = buildQueue(text, synthesis.getVoices(), profile);

    if (queue.length === 0) return false;

    stopPlayback();
    const playback = { id, stopped: false };
    begin({
        id,
        stop: () => {
            playback.stopped = true;
            synthesis.cancel();
        },
    });

    let index = 0;

    // ARCHITECT: сегменты идут строго по одному: следующий начинается по onend предыдущего. Проверка stopped и
    // сверка id отсекают хвост отменённой очереди — она не должна звучать поверх новой реплики.
    const speakNext = (): void => {
        if (playback.stopped || playing?.id !== id) return;

        const next = queue[index];

        index += 1;

        if (next === undefined) {
            finish(id);

            return;
        }

        const utterance = new SpeechSynthesisUtterance(next.text);

        utterance.voice = next.voice;
        utterance.lang = next.voice.lang;
        utterance.rate = SPEECH_RATE;
        utterance.onend = speakNext;
        utterance.onerror = speakNext;
        synthesis.speak(utterance);
    };

    speakNext();

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
