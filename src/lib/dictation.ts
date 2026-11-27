// ARCHITECT: Web Speech API нет в типах lib.dom, поэтому интерфейс объявлен локально и структурно: без any (§5.3)
// и без ветвлений по браузеру — префикс webkit проверяется одной строкой. Диктовка браузерная: аудио никуда не
// отправляется, расшифровка живёт только в поле ввода.
// ARCHITECT: распознавание настроено на en-US: пользователь тренирует английскую речь. Язык и пол озвучки
// (speechPlayback) к диктовке отношения не имеют.

/** Событие распознавания: браузерный SpeechRecognitionEvent, сведённый к нужным полям. */
export interface DictationEvent {
    readonly resultIndex: number;
    readonly results: {
        readonly length: number;
        readonly [index: number]:
            | {
                  readonly isFinal: boolean;
                  readonly [index: number]: { readonly transcript: string } | undefined;
              }
            | undefined;
    };
}

/** Сессия распознавания: ровно те методы и обработчики, которые использует запись. */
export interface DictationSession {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: DictationEvent) => void) | null;
    onerror: ((event: DictationErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

type DictationConstructor = new () => DictationSession;

interface RecogniserScope {
    readonly SpeechRecognition?: DictationConstructor;
    readonly webkitSpeechRecognition?: DictationConstructor;
}

/** Язык диктовки: тренируется английский, поэтому распознавание всегда английское. */
export const DICTATION_LANGUAGE = "en-US";

function recogniser(): DictationConstructor | null {
    if (typeof window === "undefined") return null;

    // ARCHITECT: приведение обязательно: префиксных свойств нет в типе Window, а any здесь запрещён (§5.3).
    const scope = window as unknown as RecogniserScope;

    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** Поддерживает ли браузер диктовку: где не поддерживает — кнопки микрофона не показываем вовсе. */
export function isDictationSupported(): boolean {
    return recogniser() !== null;
}

/** Сессия распознавания: continuous даёт текст по ходу речи, interim — показ до фиксации слова. */
export function createDictation(): DictationSession | null {
    const Constructor = recogniser();

    if (Constructor === null) return null;

    const session = new Constructor();

    session.lang = DICTATION_LANGUAGE;
    session.continuous = true;
    session.interimResults = true;

    return session;
}

/** Окончательные части события: их можно дописывать к расшифровке, они уже не изменятся. */
export function finalTranscript(event: DictationEvent): string {
    let text = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const part = result?.[0]?.transcript ?? "";

        if (result?.isFinal === true) text += part;
    }

    return text;
}

/** Событие отказа распознавания: браузер присылает код в поле error. */
export interface DictationErrorEvent {
    readonly error?: unknown;
}

/** Код отказа распознавания: значения совпадают с кодами Web Speech API. */
export type DictationErrorCode =
    | "not-allowed"
    | "service-not-allowed"
    | "audio-capture"
    | "network"
    | "no-speech"
    | "aborted"
    | "unknown";

const KNOWN_ERRORS: readonly DictationErrorCode[] = [
    "not-allowed",
    "service-not-allowed",
    "audio-capture",
    "network",
    "no-speech",
    "aborted",
];

/** Код отказа из события браузера: неизвестная строка сводится к "unknown", а не теряется. */
export function toDictationErrorCode(raw: unknown): DictationErrorCode {
    return typeof raw === "string" && (KNOWN_ERRORS as readonly string[]).includes(raw)
        ? (raw as DictationErrorCode)
        : "unknown";
}

/**
 * Продолжать запись нечем: отказ в доступе к микрофону, нет устройства, недоступна сеть распознавания или
 * распознавание уже завершилось по тишине. Не фатальна только наша собственная отмена — о ней молчим.
 */
export function isFatalDictationError(code: DictationErrorCode): boolean {
    return code !== "aborted";
}

/** Промежуточные части: показываются пользователю, но в отправку не попадают до фиксации. */
export function interimTranscript(event: DictationEvent): string {
    let text = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result?.isFinal === false) text += result[0]?.transcript ?? "";
    }

    return text;
}
