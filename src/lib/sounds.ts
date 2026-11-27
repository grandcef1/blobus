// ARCHITECT: сигналы интерфейса синтезируются на месте: звуковых файлов и библиотек нет — тихие синусоиды
// с мягкой огибающей, поэтому щелчка на старте и обрыва на конце не слышно. Один AudioContext на страницу:
// браузер ограничивает их число, а сигналы короткие и не пересекаются.
// ARCHITECT: гейт читается из кэша запросов, а не из пропса: тост поднимается и вне React (api-слой), а
// источник правды один — тот же ответ GET /api/settings, что показывает страница настроек.

import { queryClient } from "@/lib/query-client";
import type { SettingsState } from "@/types/settings";

export type SoundKind = "alert" | "correct" | "wrong" | "word";

/** Один тон сигнала: высота, длина и задержка от его начала. */
interface Tone {
    readonly frequency: number;
    readonly duration: number;
    readonly delay: number;
}

const SETTINGS_KEY = ["settings"] as const;
const PEAK_GAIN = 0.05;
const ATTACK_SECONDS = 0.02;
const RELEASE_SECONDS = 0.12;

// ARCHITECT: интервалы короткие и различимые на слух: верный ответ идёт вверх, промах — вниз, тост и новое
// слово — одиночный мягкий сигнал. Громкость низкая: сигнал намекает, а не требует внимания.
const SOUNDS: Record<SoundKind, readonly Tone[]> = {
    alert: [{ frequency: 587.33, duration: 0.3, delay: 0 }],
    correct: [
        { frequency: 523.25, duration: 0.26, delay: 0 },
        { frequency: 783.99, duration: 0.34, delay: 0.14 },
    ],
    wrong: [
        { frequency: 392, duration: 0.26, delay: 0 },
        { frequency: 311.13, duration: 0.34, delay: 0.14 },
    ],
    word: [
        { frequency: 440, duration: 0.24, delay: 0 },
        { frequency: 659.25, duration: 0.32, delay: 0.12 },
    ],
};

let context: AudioContext | null = null;

// ARCHITECT: настройки ещё не загружены — играем по серверному дефолту (звук включён): ждать ответ ради
// одного короткого сигнала незачем.
function soundEnabled(): boolean {
    const settings = queryClient.getQueryData<SettingsState>(SETTINGS_KEY);

    return settings?.preferences.soundEffects ?? true;
}

// ARCHITECT: webkit-префикс не поддерживаем: он не нужен ни одной поддерживаемой сборке, а непроверенный
// каст ради него ломал бы типизацию.
function ensureContext(): AudioContext | null {
    if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;
    if (context === null) context = new window.AudioContext();

    return context;
}

function scheduleTone(audio: AudioContext, tone: Tone): void {
    const start = audio.currentTime + tone.delay;
    const gain = audio.createGain();
    const oscillator = audio.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + ATTACK_SECONDS);
    gain.gain.linearRampToValueAtTime(0, start + tone.duration - RELEASE_SECONDS);

    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.duration);
}

/** Мягкий сигнал интерфейса. Выключенная настройка звука или отсутствие WebAudio — тишина без ошибки. */
export function playSound(kind: SoundKind): void {
    if (!soundEnabled()) return;

    const audio = ensureContext();

    if (audio === null) return;

    // ARCHITECT: контекст, созданный до первого жеста пользователя, спит: будим его, а если браузер всё
    // ещё держит его спящим, сигнал просто не прозвучит — ошибки нет.
    if (audio.state === "suspended") void audio.resume().catch(() => undefined);

    for (const tone of SOUNDS[kind]) scheduleTone(audio, tone);
}
